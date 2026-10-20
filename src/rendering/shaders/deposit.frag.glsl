#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_field;
uniform vec2 u_points;
uniform vec2 u_progress;
out vec4 outputColor;
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
float profile(vec2 uv, float progress) {
    float strength = smoothstep(0.0, .65, progress);
    float growth = .04 + .96 * smoothstep(0.0, 1.0, progress);
    vec2 p = uv * u_points;
    float radius = length(u_points * vec2(.5, .52)) * 1.9;
    float variation = .9 + .2 * valueNoise(p / 43.0 + 17.0);
    float r = length((uv - vec2(.5, .52)) * u_points) / max(.001, radius * growth) * variation;
    return strength * exp(-.65 * r * r) * (1.0 - smoothstep(.65, 1.0, r));
}
void main() {
    vec4 field = texture(u_field, v_uv);
    vec2 screenUV = vec2(v_uv.x, 1.0 - v_uv.y);
    float increment = max(0.0, profile(screenUV, u_progress.y) - profile(screenUV, u_progress.x));
    // Same accumulated-mass and multiplicative refog model as the iOS renderer.
    outputColor = vec4(field.r * exp(-7.0 * increment), min(1.0, field.g + increment), 0, 1);
}
