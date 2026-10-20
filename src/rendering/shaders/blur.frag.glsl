#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_source;
uniform vec2 u_axis;
out vec4 outputColor;
void main() {
    vec3 color = texture(u_source, v_uv).rgb * .227027027;
    color += texture(u_source, v_uv + u_axis * 1.3846153846).rgb * .3162162162;
    color += texture(u_source, v_uv - u_axis * 1.3846153846).rgb * .3162162162;
    color += texture(u_source, v_uv + u_axis * 3.2307692308).rgb * .0702702703;
    color += texture(u_source, v_uv - u_axis * 3.2307692308).rgb * .0702702703;
    outputColor = vec4(color, 1.0);
}
