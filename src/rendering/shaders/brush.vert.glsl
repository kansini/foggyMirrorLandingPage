#version 300 es
precision highp float;
uniform vec2 u_points;
uniform vec4 u_segment;
uniform vec3 u_brush;
out vec2 v_point;
void main() {
    const vec2 corners[6] = vec2[6](
        vec2(0, 0), vec2(1, 0), vec2(0, 1),
        vec2(1, 0), vec2(1, 1), vec2(0, 1)
    );
    vec2 start = u_segment.xy * u_points;
    vec2 end = u_segment.zw * u_points;
    vec2 lo = min(start - u_brush.x, end - u_brush.y) - u_brush.z;
    vec2 hi = max(start + u_brush.x, end + u_brush.y) + u_brush.z;
    v_point = mix(lo, hi, corners[gl_VertexID]);
    gl_Position = vec4(v_point.x / u_points.x * 2.0 - 1.0, 1.0 - v_point.y / u_points.y * 2.0, 0, 1);
}
