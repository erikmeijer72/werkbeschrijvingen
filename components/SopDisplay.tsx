import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, FileText, Download } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import saveAs from 'file-saver';

interface SopDisplayProps {
  content: string;
}

const SopDisplay: React.FC<SopDisplayProps> = ({ content }) => {
  const [copied, setCopied] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateDocxBlob = async (): Promise<Blob> => {
    // Simple markdown to docx conversion logic
    const lines = content.split('\n');
    const children: any[] = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('# ')) {
        children.push(new Paragraph({
          text: trimmed.replace('# ', ''),
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 }
        }));
      } else if (trimmed.startsWith('## ')) {
        children.push(new Paragraph({
          text: trimmed.replace('## ', ''),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 150 }
        }));
      } else if (/^\d+\./.test(trimmed)) {
        children.push(new Paragraph({
          text: trimmed,
          spacing: { after: 100 }
        }));
      } else {
        children.push(new Paragraph({
          children: [new TextRun(trimmed)],
          spacing: { after: 100 }
        }));
      }
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: children,
      }],
    });

    return await Packer.toBlob(doc);
  };

  const handleDownloadDocx = async () => {
    setDownloading(true);
    try {
      const blob = await generateDocxBlob();
      saveAs(blob, `Werkbeschrijving-${new Date().toISOString().split('T')[0]}.docx`);
    } catch (error) {
      console.error("Docx generation failed:", error);
      alert("Fout bij het genereren van het Word-bestand.");
    } finally {
      setDownloading(false);
    }
  };

  if (!content) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap gap-2 items-center justify-between bg-slate-50/50">
        <div className="flex items-center space-x-2 text-slate-700">
          <FileText className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold">Werkbeschrijving</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            title="Kopieer als tekst"
            className="flex items-center space-x-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Gekopieerd</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Tekst</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleDownloadDocx}
            disabled={downloading}
            title="Download als Word-bestand"
            className="flex items-center space-x-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {downloading ? <Check className="w-3.5 h-3.5 animate-pulse" /> : <Download className="w-3.5 h-3.5" />}
            <span>.docx</span>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <article className="prose prose-slate prose-sm md:prose-base max-w-none">
          <ReactMarkdown
             components={{
              h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-slate-900 border-b pb-4 mb-6" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4 flex items-center before:content-[''] before:w-1 before:h-6 before:bg-blue-500 before:mr-3 before:rounded-full" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-lg font-medium text-slate-800 mt-6 mb-3" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc list-outside ml-6 space-y-2 text-slate-600" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-6 space-y-3 text-slate-600" {...props} />,
              li: ({node, ...props}) => <li className="pl-1 leading-relaxed" {...props} />,
              strong: ({node, ...props}) => <strong className="font-bold text-slate-900 bg-slate-100 px-1 py-0.5 rounded" {...props} />,
              em: ({node, ...props}) => <em className="block mt-1 text-slate-500 text-sm font-normal not-italic border-l-2 border-yellow-400 pl-3 py-1 bg-yellow-50/50" {...props} />,
              p: ({node, ...props}) => <p className="mb-4 text-slate-600 leading-relaxed" {...props} />,
            }}
          >
            {content}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
};

export default SopDisplay;