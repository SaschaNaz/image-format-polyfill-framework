namespace Polymage {
    const extensionRegex = /\.\w+$/;
    /*
    An image decoder should keep ImageAccess object to access elements multiple times
    */
    export type DecoderCallback = (imageAccess: ImageAccess) => void;
    const decoderMap = new Map<string, DecoderCallback>();
    /**
     * @param imageType prefix with dot(.) for file extensions, or it will be processed as mime-type
     */
    export function register(imageType: string, decoderCallback: DecoderCallback) {
        if (decoderMap.has(imageType)) {
            throw new Error(`Decoder for ${imageType} has already been registered.`)
        }
        decoderMap.set(imageType, decoderCallback);
    }
    export function unregister(mimeType: string) {
        decoderMap.delete(mimeType);
    }
    export function has(mimeType: string) {
        return decoderMap.has(mimeType);
    }

    export interface ImageAccess {
        draw(buffer: ArrayBuffer, width: number, height: number): void;
    }
    interface DrawTarget {
        image: HTMLImageElement;
        canvas: HTMLCanvasElement;
    }
    // const map = new WeakMap<ImageAccess, DrawTarget>();

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
    })
    export function observe() {
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
    export function stop() {
        observer.disconnect();
    }

    function process(pair: Pair) {
        const callback = decoderMap.get(pair.type);
        const target: DrawTarget = { image: pair.element, canvas: document.createElement("canvas") }
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

    interface Pair {
        element: HTMLImageElement;
        type: string;
    }
    function select(nodes: Node[]): Pair[] {
        // TODO: support data-url with mime type
        // TODO: support x-mime-type to urls without file extensions
        // TODO: support <picture> with <source type="(mime-type)" />
        // TODO: support blob-url with mime type (with fetch())
        return nodes.filter(node => node instanceof HTMLImageElement).map(generatePair).filter(pair => has(pair.type));
    }
    function generatePair(item: HTMLImageElement) {
        const match = item.src && item.src.match(extensionRegex);
        return { element: item, type: match[0] }
    }

    function canvasConvertToBlob(canvas: HTMLCanvasElement) {
        return new Promise<Blob>(resolve => {
            if (canvas.toBlob) {
                canvas.toBlob(result => resolve(result), "image/png")
            }
            else if (canvas.msToBlob) {
                resolve(canvas.msToBlob());
            }
        })
    }
}
export default Polymage;