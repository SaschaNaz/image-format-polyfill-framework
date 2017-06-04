/// <reference types="jake" />
const ignore = require("ts-module-ignore").default;

const jakeExecOptionBag = {
    printStdout: true,
    printStderr: true
};

/**
 * 
 * @param {string[]} cmds 
 */
function asyncExec(cmds) {
    return new Promise((resolve, reject) => {
        try {
            jake.exec(cmds, () => resolve(), jakeExecOptionBag)
        }
        catch (e) {
            reject(e);
        }
    });
}

desc("tsc");
task("tsc", async () => {
    await asyncExec(["tsc"]);
});

desc("default");
task("default", ["tsc"], async () => {
    await ignore("built/polymage.d.ts", "built/polymage-global.d.ts");
});