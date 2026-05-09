import { HardDrive } from "lucide-react";

export default function SystemReqs({ steamData, steamLoading, currentTheme }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="bg-black/40 backdrop-blur-[40px] border border-white/10 p-10 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${currentTheme.textGradient}`} />
        <h3 className={`text-xl font-black mb-8 flex items-center gap-3 uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.textGradient}`}>
          <HardDrive className={currentTheme.iconColor} size={24} /> System Requirements
        </h3>
        {steamLoading ? (
          <div className="space-y-4">
            <div className="h-4 skeleton rounded w-3/4" />
            <div className="h-4 skeleton rounded w-1/2" />
            <div className="h-4 skeleton rounded w-5/6 mt-6" />
          </div>
        ) : steamData?.pc_requirements?.minimum ? (
          <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-loose" dangerouslySetInnerHTML={{ __html: steamData.pc_requirements.minimum }} />
        ) : (
          <p className="text-gray-500 italic">Requirements not available on database.</p>
        )}
      </div>
    </div>
  );
}