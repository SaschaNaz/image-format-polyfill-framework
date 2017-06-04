"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Polymage;
(function (Polymage) {
    const extensionRegex = /\.\w+$/;
    const decoderMap = new Map();
    /**
     * @param imageType prefix with dot(.) for file extensions, or it will be processed as mime-type
     */
    function register(imageType, decoderCallback) {
        if (decoderMap.has(imageType)) {
            throw new Error(`Decoder for ${imageType} has already been registered.`);
        }
        decoderMap.set(imageType, decoderCallback);
    }
    Polymage.register = register;
    function unregister(mimeType) {
        decoderMap.delete(mimeType);
    }
    Polymage.unregister = unregister;
    function has(mimeType) {
        return decoderMap.has(mimeType);
    }
    Polymage.has = has;
    let observing = false;
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const pair of select(Array.from(mutation.addedNodes))) {
                process(pair);
            }
            if (mutation.attributeName === "src" && mutation.target instanceof HTMLImageElement) {
                process(generatePair(mutation.target));
            }
        }
    });
    function observe() {
        observing = true;
        try {
            if (document.body) {
                for (const pair of select(Array.from(document.body.children))) {
                    process(pair);
                }
            }
            observer.observe(document.body, {
                childList: true,
                attributes: true,
                attributeFilter: ["src"],
                subtree: true
            });
        }
        catch (e) {
            observing = false;
        }
    }
    Polymage.observe = observe;
    function stop() {
        observer.disconnect();
    }
    Polymage.stop = stop;
    function process(pair) {
        const callback = decoderMap.get(pair.type);
        const target = { image: pair.element, canvas: document.createElement("canvas") };
        callback({
            draw: async (buffer, width, height) => {
                const context = target.canvas.getContext("2d");
                target.canvas.width = width;
                target.canvas.height = height;
                context.putImageData(new ImageData(new Uint8ClampedArray(buffer), width, height), 0, 0);
                target.image.src = URL.createObjectURL(await canvasConvertToBlob(target.canvas), { oneTimeOnly: true });
            }
        });
    }
    function select(nodes) {
        // TODO: support data-url with mime type
        // TODO: support x-mime-type to urls without file extensions
        // TODO: support <picture> with <source type="(mime-type)" />
        // TODO: support blob-url with mime type (with fetch())
        return nodes.filter(node => node instanceof HTMLImageElement).map(generatePair).filter(pair => has(pair.type));
    }
    function generatePair(item) {
        const match = item.src && item.src.match(extensionRegex);
        return { element: item, type: match[0] };
    }
    function canvasConvertToBlob(canvas) {
        return new Promise(resolve => {
            if (canvas.toBlob) {
                canvas.toBlob(result => resolve(result), "image/png");
            }
            else if (canvas.msToBlob) {
                resolve(canvas.msToBlob());
            }
        });
    }
})(Polymage || (Polymage = {}));
exports.default = Polymage;
//# sourceMappingURL=polymage.js.map