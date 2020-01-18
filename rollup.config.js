import babel from "rollup-plugin-babel";
import resolve from "rollup-plugin-node-resolve";

export default {
    input: "src/index.ts",
    output: {
        file: "dist/index.js",
        format: "cjs",
    },
    plugins: [
        resolve({
            jsnext: true,
            extensions: [".ts", ".js"],
        }),
        babel({
            extensions: [".ts", ".js"],
            exclude: "node_modules/**", // only transpile our source code
        }),
    ],
};
