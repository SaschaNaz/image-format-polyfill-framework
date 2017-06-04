declare namespace Polymage {
    type DecoderCallback = (imageAccess: ImageAccess) => void;
    /**
     * @param imageType prefix with dot(.) for file extensions, or it will be processed as mime-type
     */
    function register(imageType: string, decoderCallback: DecoderCallback): void;
    function unregister(mimeType: string): void;
    function has(mimeType: string): boolean;
    interface ImageAccess {
        draw(buffer: ArrayBuffer, width: number, height: number): void;
    }
    function observe(): void;
    function stop(): void;
}

