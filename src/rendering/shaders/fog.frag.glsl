#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_sharp;
uniform sampler2D u_blurred;
uniform sampler2D u_field;
uniform vec2 u_points;
uniform float u_density;
uniform float u_amount;
uniform float u_dark;
uniform int u_style;
uniform vec4 u_waterOrigin[4];
uniform vec4 u_waterMotion[4];
uniform int u_waterCount;
out vec4 outputColor;

// Optical model ported from FogShaders.metal.txt. Coordinates are CSS points,
// so screen density does not change the apparent size of condensation.
float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}
float valueNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1, 0)), f.x),
               mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), f.x), f.y);
}
struct Condensation { float coverage; vec2 slope; float height; float rim; };
Condensation beads(vec2 p, float pitch, float seed, float occupancy) {
    vec2 cell = floor(p / pitch);
    Condensation result = Condensation(0.0, vec2(0), 0.0, 0.0);
    float best = 10.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
        vec2 id = cell + vec2(float(x), float(y));
        if (hash21(id + seed + 91.0) > occupancy) continue;
        float h = hash21(id + seed);
        float size = hash21(id + seed + 37.0);
        vec2 center = (id + vec2(.06 + .88 * h, .06 + .88 * hash21(id + seed + 17.0))) * pitch;
        float radius = pitch * (.22 + .32 * size * size);
        vec2 axis = normalize(vec2(1, (h - .5) * 1.2));
        vec2 delta = p - center;
        vec2 d = vec2(dot(delta, axis), dot(delta, vec2(-axis.y, axis.x))) / radius;
        d.y /= .82 + .65 * hash21(id + seed + 63.0);
        vec2 shapePosition = clamp(d, -1.0, 1.0);
        float shape = 1.0 + .14 * shapePosition.y + .08 * shapePosition.x * shapePosition.y;
        float distanceToCenter = length(d) / shape;
        if (distanceToCenter < best) {
            best = distanceToCenter;
            float feather = clamp(.22 / radius, .08, .32);
            result.coverage = 1.0 - smoothstep(1.0 - feather, 1.0 + feather, distanceToCenter);
            result.height = sqrt(max(0.0, 1.0 - min(1.0, distanceToCenter * distanceToCenter)));
            result.slope = (d.x * axis + d.y * vec2(-axis.y, axis.x)) * result.coverage;
            result.rim = smoothstep(.62, .94, distanceToCenter) * result.coverage;
        }
    }
    return result;
}
float beadLight(Condensation bead, float luma) {
    vec3 normal = normalize(vec3(bead.slope, .35 + .85 * bead.height));
    float facing = dot(normal, normalize(vec3(-.55, -.65, 1)));
    float glint = pow(max(0.0, facing), 24.0) * bead.coverage;
    float meniscus = dot(bead.slope, normalize(vec2(.55, .65))) * bead.rim;
    return glint * (.11 + .13 * luma) - meniscus * .12 - bead.rim * .018;
}
float waterBend(float distanceAlong, float phase) {
    return 1.8 * (sin(distanceAlong * .035 + phase) - sin(phase))
         + .65 * (sin(distanceAlong * .11 + phase * 1.7) - sin(phase * 1.7));
}
vec3 mirrorTone(vec3 color, vec2 uv) {
    float luma = dot(color, vec3(.2126, .7152, .0722));
    if (u_style == 1) color *= vec3(.88, .96, 1.04) * .94;
    else if (u_style == 2) {
        float edge = smoothstep(.22, .75, length(uv - .5));
        float patina = valueNoise(uv * vec2(8, 13));
        color = mix(color, vec3(luma) * vec3(1.10, 1.01, .87), .32);
        color = color * vec3(1.04, 1, .92) * (1.0 - edge * .12) + (patina - .5) * .008;
    } else if (u_style == 3) color = mix(color, vec3(luma), .16) * vec3(.93, .98, 1.07);
    else color *= vec3(1.025, 1.005, .975);
    return clamp(color * mix(1.0, .68, u_dark), 0.0, 1.0);
}
void main() {
    vec2 uv = v_uv;
    vec2 screenUV = vec2(uv.x, 1.0 - uv.y);
    vec2 field = texture(u_field, uv).rg;
    float wipe = field.r;
    float surfaceDensity = (1.0 - (1.0 - u_density) * exp(-1.65 * field.g)) * u_amount;
    float density = surfaceDensity * (1.0 - wipe);
    vec3 clearColor = texture(u_sharp, uv).rgb;
    if (density < .001 && u_waterCount == 0) {
        outputColor = vec4(mirrorTone(clearColor, screenUV), 1);
        return;
    }
    vec2 p = screenUV * u_points;
    float patchValue = valueNoise(screenUV * vec2(4.5, 8));
    float coverage = 1.0 - pow(1.0 - density, 1.65);
    float localFog = clamp(coverage * (.94 + .12 * patchValue), 0.0, 1.0);
    vec2 warp = vec2(valueNoise(p / 19.0), valueNoise(p / 23.0 + 41.0)) - .5;
    Condensation fine = beads(p + warp * 4.5, u_style == 3 ? 1.95 : 2.35, 13.0, .94);
    Condensation large = beads(p + warp * 2.0, u_style == 1 ? 8.2 : 6.4, 74.0,
        u_style == 1 ? .57 : (u_style == 3 ? .22 : .34));
    float fineAmount = .65 + .35 * valueNoise(p / 48.0 + 9.0);
    float largeAmount = .38 + .62 * smoothstep(.18, .82, valueNoise(p / 64.0));
    float largeCoverage = large.coverage * largeAmount;
    float fineCoverage = fine.coverage * fineAmount * (1.0 - largeCoverage);
    float wet = clamp(fineCoverage + largeCoverage, 0.0, 1.0);
    vec2 normal = fine.slope * fineAmount * .45 * (1.0 - largeCoverage) + large.slope * largeAmount * 1.5;
    float trail = 0.0, rim = 0.0;
    vec2 trailNormal = vec2(0);
    for (int i = 0; i < 4; i++) {
        if (i >= u_waterCount) break;
        if (u_waterMotion[i].y < .001) continue;
        vec2 origin = u_waterOrigin[i].xy * u_points;
        float width = u_waterOrigin[i].z;
        float phase = u_waterOrigin[i].w;
        float travel = u_waterMotion[i].x;
        float fade = u_waterMotion[i].y;
        float q = p.y - origin.y;
        float bend = waterBend(max(0.0, q), phase);
        float channelWidth = width * (.75 + .25 * sin(max(0.0, q) * .08 + phase));
        float dx = p.x - origin.x - bend;
        float vertical = smoothstep(-1.0, 3.0, q) * (1.0 - smoothstep(travel - 2.0, travel + 1.0, q));
        float body = (1.0 - smoothstep(channelWidth * .35, channelWidth, abs(dx))) * vertical;
        float radius = u_waterMotion[i].z;
        vec2 tip = vec2(p.x - origin.x - waterBend(travel, phase), q - travel) / vec2(radius, radius * 1.3);
        float tipBody = 1.0 - smoothstep(.7, 1.05, length(tip));
        float amount = max(body, tipBody) * fade * surfaceDensity;
        trail = max(trail, amount);
        rim = max(rim, exp(-pow((abs(dx) - channelWidth * .8) * 2.0, 2.0)) * vertical * fade);
        trailNormal.x += amount * clamp(dx / max(.3, channelWidth), -1.0, 1.0);
        trailNormal.y += tipBody * clamp(tip.y, -1.0, 1.0) * fade;
    }
    normal *= 1.0 - trail;
    vec2 offset = vec2(normal.x, -normal.y) * 1.65 / u_points;
    offset += vec2(trailNormal.x, -trailNormal.y) * 1.8 / u_points;
    vec3 diffuse = texture(u_blurred, uv + offset).rgb;
    vec3 refracted = texture(u_sharp, uv + offset).rgb;
    vec3 color = mix(clearColor, diffuse, localFog * .985);
    color *= 1.0 - localFog * .15;
    float luma = dot(color, vec3(.2126, .7152, .0722));
    color = mix(color, vec3(luma), localFog * .16);
    color = mix(color, refracted * .97, trail * .90);
    color = mix(color, refracted * .96, wet * localFog * (.07 + .13 * largeCoverage) * (1.0 - trail));
    float roughness = (hash21(floor(p * 2.2)) - .5) * .006;
    float lighting = beadLight(fine, luma) * fineAmount * (1.0 - largeCoverage) + beadLight(large, luma) * largeAmount;
    color += localFog * (roughness + lighting * (1.0 - trail));
    color += rim * u_amount * (trailNormal.x < 0.0 ? .07 : -.045);
    float wipeRim = smoothstep(.02, .22, wipe) * (1.0 - smoothstep(.55, .98, wipe));
    color += wipeRim * surfaceDensity * .025;
    outputColor = vec4(mirrorTone(clamp(color, 0.0, 1.0), screenUV), 1);
}
