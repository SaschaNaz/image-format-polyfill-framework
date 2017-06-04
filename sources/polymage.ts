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

    let observing = false;
    const observer = new MutationObserver(async (mutations) => {
        for (const mutation of mutations) {
            for (const pair of await select(Array.from(mutation.addedNodes))) {
                process(pair);
            }
            if (mutation.attributeName === "src" && mutation.target instanceof HTMLImageElement) {
                process(await generatePair(mutation.target));
            }
        }
    })
    export async function observe() {
        observing = true;
        try {
            if (document.body) {
                for (const pair of await select(Array.from(document.body.children))) {
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
        // TODO: give data to decode
        // TODO: onunload to allow decoders to abort
        callback({ 
            draw: async (buffer, width, height) => {
                const context = target.canvas.getContext("2d");
                target.canvas.width = width;
                target.canvas.height = height;
                context.putImageData(new ImageData(new Uint8ClampedArray(buffer), width, height), 0, 0);
                const blobUrl = URL.createObjectURL(await canvasConvertToBlob(target.canvas));
                target.image.setAttribute("x-polymage-src", blobUrl)
                target.image.src = blobUrl;
            }
        });
    }

    interface Pair {
        element: HTMLImageElement;
        type: string;
    }
    async function select(nodes: Node[]): Promise<Pair[]> {
        // TODO: support data-url with mime type
        // TODO: support x-mime-type to urls without file extensions
        // TODO: support <picture> with <source type="(mime-type)" />
        const pairs = await Promise.all(nodes.filter(node => node instanceof HTMLImageElement).map(generatePair))
        return pairs.filter(pair => has(pair.type));
    }
    async function generatePair(item: HTMLImageElement): Promise<Pair> {
        if (!item.src) {
            return { element: item, type: undefined };
        }
        if (item.src.startsWith("blob:") && item.src !== item.getAttribute("x-polymage-src")) {
            try {
                const response = await fetch(item.src);
                const blob = await response.blob();
                return { element: item, type: blob.type }
            }
            catch (e) {
            }
        }
        
        return { element: item, type: item.src.match(extensionRegex)[0] }
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