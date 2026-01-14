import React, { useState } from 'react';
import { Loader2, Sparkles, AlertTriangle, FileText, Mail, Send, History, CheckCircle2 } from 'lucide-react';
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
      setError(err.message || "Er is een onverwachte fout opgetreden bij het verwerken.");
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
      
      const lines = result.split('\n');
      const titleLine = lines.find(line => line.trim().startsWith('# '));
      const cleanTitle = titleLine 
        ? titleLine.replace('# ', '').trim() 
        : `Werkbeschrijving - ${new Date().toLocaleDateString('nl-NL')}`;

      const subject = encodeURIComponent(cleanTitle);
      const body = encodeURIComponent("Zie de bijgevoegde werkbeschrijving (gekopieerd naar klembord).\n\nMet vriendelijke groet,");
      
      return { subject, body };
    } catch (err) {
      console.error('Failed to copy text: ', err);
      return null;
    }
  };

  const handleSendEmail = async () => {
    const data = await prepareEmailData();
    if (!data) return;
    window.location.href = `mailto:${DEFAULT_RECIPIENT}?subject=${data.subject}&body=${data.body}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 backdrop-blur-md bg-white/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-blue-200 shadow-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900 leading-none">
                Werkbeschrijvingen <span className="text-blue-600">PRO</span>
              </h1>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-4">
             <div className="flex items-center space-x-1 text-slate-400 text-xs font-medium">
                <History className="w-3.5 h-3.5" />
                <span>v1.2.0</span>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <div className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-2">Start Opname</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Leg de stappen mondeling uit. Onze AI zet het direct om in een professionele werkbeschrijving volgens de Master Prompt richtlijnen.
                </p>
              </div>
              
              <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 mb-6">
                <FileUploader 
                  selectedFile={file}
                  onFileSelect={setFile}
                  onClear={handleClear}
                  disabled={status === FileStatus.PROCESSING || status === FileStatus.READING}
                />
              </div>

              {file && (status === FileStatus.IDLE || status === FileStatus.COMPLETE) && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-4">
                  <button
                    onClick={handleProcess}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-blue-100 hover:shadow-blue-200 transform active:scale-[0.98]"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>{status === FileStatus.COMPLETE ? "Opnieuw genereren" : "Genereer Werkbeschrijving"}</span>
                  </button>
                  {status === FileStatus.COMPLETE && (
                    <p className="text-center text-[10px] text-slate-400 font-medium">Klaar! Bekijk het resultaat rechts.</p>
                  )}
                </div>
              )}

              {(status === FileStatus.READING || (status === FileStatus.PROCESSING && !result)) && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8 flex flex-col items-center text-center animate-pulse">
                  <div className="relative mb-4">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <Sparkles className="w-4 h-4 text-blue-400 absolute -top-1 -right-1" />
                  </div>
                  <h3 className="font-bold text-blue-900 text-lg">
                    {status === FileStatus.READING ? "Audio laden..." : "SOP Schrijven..."}
                  </h3>
                  <p className="text-sm text-blue-700/70 mt-2 max-w-[200px]">
                    De AI structureert uw instructies tot een professionele documentatie.
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-start space-x-4 animate-in shake">
                  <div className="bg-red-100 p-2 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-red-900 text-sm">Verwerkingsfout</h3>
                    <p className="text-xs text-red-700 mt-1 leading-relaxed">{error}</p>
                    <button onClick={handleProcess} className="text-xs font-bold text-red-600 mt-3 hover:underline">Opnieuw proberen</button>
                  </div>
                </div>
              )}
            </section>

            {status === FileStatus.COMPLETE && result && (
              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 bg-indigo-50 rounded-xl">
                    <Mail className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Distributie</h3>
                    <p className="text-xs text-slate-500">Klaar om te delen met het team.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                     <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Ontvanger</span>
                        <span className="text-sm font-medium text-slate-700">{DEFAULT_RECIPIENT}</span>
                     </div>
                  </div>
                  
                  <button
                    onClick={handleSendEmail}
                    className={`w-full group flex items-center justify-center space-x-3 py-4 px-6 rounded-2xl transition-all shadow-md active:scale-[0.98] ${
                      emailStatus === 'copied' 
                        ? 'bg-green-600 text-white shadow-green-100' 
                        : 'bg-slate-900 text-white shadow-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {emailStatus === 'copied' ? <CheckCircle2 className="w-5 h-5" /> : <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                    <span className="font-bold">
                      {emailStatus === 'copied' ? 'Tekst Gekopieerd & Mail Openen' : `Verstuur via Email`}
                    </span>
                  </button>
                </div>
              </section>
            )}
          </div>

          <div className="lg:col-span-7 h-full min-h-[600px] lg:sticky lg:top-24">
            {result || status === FileStatus.PROCESSING ? (
              <div className="h-full flex flex-col">
                <SopDisplay content={result} />
              </div>
            ) : (
              <div className="h-full bg-white rounded-2xl shadow-sm border border-slate-200 border-dashed flex flex-col items-center justify-center p-12 text-center group">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <FileText className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-slate-900 font-bold text-xl">Wachtend op input</h3>
                <p className="text-slate-500 max-w-xs mt-3 text-sm leading-relaxed">
                  Zodra je de opname start en verwerkt, verschijnt hier de professionele werkbeschrijving.
                </p>
                <div className="mt-8 flex items-center space-x-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
                   <div className="w-2 h-2 bg-slate-300 rounded-full animate-pulse"></div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Systeem Standby</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
      
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-slate-400 text-[10px] font-medium uppercase tracking-[0.2em]">
        © {new Date().getFullYear()} Werkbeschrijvingen PRO • Powered by Gemini AI
      </footer>
    </div>
  );
}

export default App;