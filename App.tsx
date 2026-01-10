import React, { useState } from 'react';
import { Loader2, Sparkles, AlertTriangle, FileText, Mail, Send } from 'lucide-react';
import FileUploader from './components/FileUploader';
import SopDisplay from './components/SopDisplay';
import { generateSOP } from './services/geminiService';
import { FileStatus } from './types';

const DEFAULT_RECIPIENT = 'Erik.meijer@prenatal.nl';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<FileStatus>(FileStatus.IDLE);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'copied'>('idle');

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        const base64Content = base64String.split(',')[1];
        resolve(base64Content);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleProcess = async () => {
    if (!file) return;

    setStatus(FileStatus.READING);
    setError(null);
    setResult('');

    try {
      const base64 = await convertFileToBase64(file);
      setStatus(FileStatus.PROCESSING);
      
      const finalSop = await generateSOP(base64, file.type, (partial) => {
        setResult(partial);
      });
      
      setResult(finalSop);
      setStatus(FileStatus.COMPLETE);
    } catch (err: any) {
      console.error(err);
      setStatus(FileStatus.ERROR);
      setError(err.message || "An unexpected error occurred while processing the file.");
    }
  };

  const handleClear = () => {
    setFile(null);
    setResult('');
    setStatus(FileStatus.IDLE);
    setError(null);
  };

  const prepareEmailData = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setEmailStatus('copied');
      setTimeout(() => setEmailStatus('idle'), 4000);
      
      // Try to find the title in the markdown result (first line starting with #)
      const lines = result.split('\n');
      const titleLine = lines.find(line => line.trim().startsWith('# '));
      const cleanTitle = titleLine 
        ? titleLine.replace('# ', '').trim() 
        : `Werkbeschrijving - ${new Date().toLocaleDateString('nl-NL')}`;

      const subject = encodeURIComponent(cleanTitle);
      const body = "";
      
      return { subject, body };
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Kon tekst niet kopiëren naar klembord. Kopieer handmatig.');
      return null;
    }
  };

  const handleSendEmail = async () => {
    const data = await prepareEmailData();
    if (!data) return;

    window.location.href = `mailto:${DEFAULT_RECIPIENT}?subject=${data.subject}&body=${data.body}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">
              Record werkbeschrijvingen
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
          
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-1">Nieuwe Opname</h2>
              <p className="text-slate-500 text-sm mb-6">Start een opname om direct een werkbeschrijving te genereren.</p>
              
              <FileUploader 
                selectedFile={file}
                onFileSelect={setFile}
                onClear={handleClear}
                disabled={status === FileStatus.PROCESSING || status === FileStatus.READING}
              />

              {file && (status === FileStatus.IDLE || status === FileStatus.COMPLETE) && (
                <div className="mt-6">
                  <button
                    onClick={handleProcess}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg transform active:scale-[0.98]"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>{status === FileStatus.COMPLETE ? "Opnieuw genereren" : "Genereer werkbeschrijving"}</span>
                  </button>
                </div>
              )}

              {(status === FileStatus.READING || (status === FileStatus.PROCESSING && !result)) && (
                <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col items-center text-center">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                  <h3 className="font-medium text-blue-900">
                    {status === FileStatus.READING ? "Audio verwerken..." : "Schrijven..."}
                  </h3>
                  <p className="text-sm text-blue-600 mt-1">
                    De AI maakt een korte en bondige werkbeschrijving.
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-6 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-900 text-sm">Fout bij verwerken</h3>
                    <p className="text-xs text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-6">
            {result || status === FileStatus.PROCESSING ? (
              <>
                <SopDisplay content={result} />
                
                {status === FileStatus.COMPLETE && (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <Mail className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">Distributie</h3>
                          <p className="text-xs text-slate-500">Verstuur de werkbeschrijving via e-mail.</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={handleSendEmail}
                        className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all shadow-sm ${
                          emailStatus === 'copied' 
                            ? 'bg-green-600 text-white hover:bg-green-700' 
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        <Send className="w-5 h-5" />
                        <span className="font-medium">
                          {emailStatus === 'copied' ? 'Tekst Gekopieerd & Mail Openen' : `Mail versturen`}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full min-h-[500px] bg-white rounded-xl shadow-sm border border-slate-200 border-dashed flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-slate-900 font-medium text-lg">Nog geen werkbeschrijving</h3>
                <p className="text-slate-500 max-w-sm mt-2">
                  Record een werkbeschrijving
                </p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

export default App;