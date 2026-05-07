// Manages profile view, avatar upload, and download directory selection.
import { User, Image as ImageIcon, HardDrive, Zap } from "lucide-react"; // <-- Added Zap

export default function ProfileSettings({ profile, setProfile, currentTheme }) {
  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newProf = { ...profile, avatar: reader.result };
        setProfile(newProf);
        window.api.updateProfile(newProf);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNameChange = (e) => {
    const newProf = { ...profile, name: e.target.value };
    setProfile(newProf);
    window.api.updateProfile(newProf);
  };

  const handleDirectorySelect = async () => {
    const newPath = await window.api.selectDirectory();
    if (newPath) {
      const newProf = { ...profile, downloadPath: newPath };
      setProfile(newProf);
      window.api.updateProfile(newProf);
    }
  };

  // <-- Handle the new toggle
  const handleLiteModeToggle = () => {
    const newProf = { ...profile, liteMode: !profile.liteMode };
    setProfile(newProf);
    window.api.updateProfile(newProf);
  };

  return (
    <div className="p-12 max-w-4xl mx-auto w-full flex flex-col gap-8">
      <h2
        className={`text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.textGradient}`}
      >
        Profile Settings
      </h2>

      <div className="bg-black/40 backdrop-blur-[80px] border border-white/10 p-10 rounded-3xl flex flex-col items-center gap-8 shadow-2xl relative overflow-hidden">
        <div
          className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${currentTheme.textGradient}`}
        />
        <div className="relative group cursor-pointer">
          <div className="w-40 h-40 rounded-full bg-black/60 border-4 border-white/10 overflow-hidden shadow-2xl">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={80} className="m-10 text-gray-500" />
            )}
          </div>
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex flex-col items-center justify-center">
            <ImageIcon size={30} className={currentTheme.iconColor} />
            <span className="text-xs font-bold mt-2">Upload Avatar</span>
          </div>
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={handleAvatarUpload}
          />
        </div>

        <div className="w-full text-center">
          <label
            className={`text-xs font-black uppercase tracking-widest mb-2 block ${currentTheme.iconColor}`}
          >
            Username
          </label>
          <input
            type="text"
            value={profile.name}
            onChange={handleNameChange}
            className="bg-black/60 border border-white/10 rounded-xl px-6 py-3 w-72 text-center font-bold text-2xl focus:outline-none focus:border-white/30 text-white hover:bg-black/80 transition-all"
          />
        </div>
      </div>

      <div className="bg-black/40 p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-center">
        <div
          className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${currentTheme.textGradient}`}
        />
        <label
          className={`text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${currentTheme.iconColor}`}
        >
          <HardDrive size={16} /> Download Directory
        </label>
        <div className="flex gap-4 items-center">
          <input
            type="text"
            readOnly
            value={profile.downloadPath || ""}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none cursor-default font-mono truncate"
          />
          <button
            onClick={handleDirectorySelect}
            className={`px-6 py-3 rounded-xl font-bold tracking-wider text-xs transition-all shadow-lg border border-white/10 hover:scale-105 active:scale-95 ${currentTheme.activeBg}`}
          >
            CHANGE
          </button>
        </div>
      </div>

      <div className="bg-black/40 p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-center">
        <div
          className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${currentTheme.textGradient}`}
        />
        <div className="flex items-center justify-between">
          <div>
            <label
              className={`text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2 ${currentTheme.iconColor}`}
            >
              <Zap size={16} /> Lite Mode (Performance)
            </label>
            <p className="text-sm text-gray-400 font-medium mt-1">
              Disables heavy animations, rendering blurs, and graphical effects
              for a snappier experience.
            </p>
          </div>
          <button
            onClick={handleLiteModeToggle}
            className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 border border-white/10 ${profile.liteMode ? currentTheme.color : "bg-black"}`}
          >
            <div
              className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform ${profile.liteMode ? "translate-x-6" : ""}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
