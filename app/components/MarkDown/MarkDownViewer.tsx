import MarkdownContent from "@/app/components/Response/MarkdownContent";

const MarkDownViewer = ({ respon }: { respon: string }) => {
    return <MarkdownContent content={respon} />;
};

export default MarkDownViewer;
