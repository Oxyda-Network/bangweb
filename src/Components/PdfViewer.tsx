import { Worker, Viewer, ViewerProps } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

interface PdfViewerProps {
    fileUrl: string;
    onClose: () => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ fileUrl, onClose }) => {
    const defaultLayoutPluginInstance = defaultLayoutPlugin();

    const viewerProps: ViewerProps = {
        fileUrl: fileUrl,
        plugins: [defaultLayoutPluginInstance],
        onDocumentLoad: (document) => console.log('PDF document loaded:', document),
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-lg shadow-lg w-3/4 h-3/4 relative">
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-600 hover:text-gray-900">
                    Close
                </button>
                <Worker>
                    <Viewer {...viewerProps} />
                </Worker>
            </div>
        </div>
    );
};

export default PdfViewer;