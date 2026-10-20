#version 300 es
precision highp float;
uniform vec2 u_points;
uniform vec4 u_segment;
uniform vec3 u_brush;
in vec2 v_point;
out vec4 outputColor;
void main() {
    vec2 start = u_segment.xy * u_points;
    vec2 end = u_segment.zw * u_points;
    vec2 direction = end - start;
    float span = length(direction);
    float dr = u_brush.y - u_brush.x;
    float distanceToEdge;
    if (span <= abs(dr) + .001) {
        vec2 center = dr > 0.0 ? end : start;
        distanceToEdge = length(v_point - center) - max(u_brush.x, u_brush.y);
    } else {
        vec2 axis = direction / span;
        vec2 delta = v_point - start;
        float across = abs(delta.x * axis.y - delta.y * axis.x);
        float t = clamp((dot(delta, axis) + across * dr / sqrt(span * span - dr * dr)) / span, 0.0, 1.0);
        distanceToEdge = length(v_point - mix(start, end, t)) - mix(u_brush.x, u_brush.y, t);
    }
    float cleared = 1.0 - smoothstep(-u_brush.z, 0.0, distanceToEdge);
    // Red is wipe coverage. Preserve the deposited fog mass in green.
    outputColor = vec4(cleared, 0.0, 0.0, 1.0);
}
