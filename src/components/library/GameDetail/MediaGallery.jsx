import { useRef } from "react";
import { motion } from "framer-motion";
import { PlaySquare, ChevronLeft, ChevronRight, Info } from "lucide-react";

export default function MediaGallery({
  steamData,
  steamLoading,
  currentTheme,
}) {
  const carouselRef = useRef(null);

  const scrollCarousel = (dir) => {
    if (carouselRef.current)
      carouselRef.current.scrollBy({
        left: dir === "left" ? -600 : 600,
        behavior: "smooth",
      });
  };

  return (
    <>
      <div className="relative z-10 bg-[#030303] w-full pt-10 pb-8 border-b border-white/5">
        <div className="max-w-[1400px] mx-auto w-full px-12">
          <h2
            className={`flex items-center gap-3 text-2xl font-black mb-6 uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.textGradient}`}
          >
            <PlaySquare className={currentTheme.iconColor} /> Media Gallery
          </h2>
          <div className="relative group/carousel">
            {steamLoading ? (
              <div className="flex gap-6 overflow-hidden">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-[450px] h-72 skeleton rounded-2xl shrink-0 shadow-xl"
                  />
                ))}
              </div>
            ) : steamData ? (
              <>
                <button
                  onClick={() => scrollCarousel("left")}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-14 h-14 rounded-full bg-black/80 backdrop-blur-3xl border border-white/20 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all hover:scale-110 shadow-2xl"
                >
                  <ChevronLeft size={30} className={currentTheme.iconColor} />
                </button>
                <button
                  onClick={() => scrollCarousel("right")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-14 h-14 rounded-full bg-black/80 backdrop-blur-3xl border border-white/20 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all hover:scale-110 shadow-2xl"
                >
                  <ChevronRight size={30} className={currentTheme.iconColor} />
                </button>
                <motion.div
                  ref={carouselRef}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-6 overflow-x-auto pb-4 no-scrollbar scroll-smooth"
                >
                  {steamData.movies?.map((m) =>
                    m.webm?.max ? (
                      <video
                        key={m.id}
                        src={m.webm.max}
                        controls
                        className="h-72 rounded-2xl shrink-0 border border-white/10 bg-black shadow-2xl object-cover"
                      />
                    ) : null,
                  )}
                  {steamData.screenshots?.map((s) => (
                    <img
                      key={s.id}
                      src={s.path_full}
                      className="h-72 rounded-2xl shrink-0 border border-white/10 object-cover shadow-2xl"
                      alt="screenshot"
                    />
                  ))}
                </motion.div>
              </>
            ) : (
              <p className="text-gray-400 italic bg-white/5 border border-white/5 p-8 rounded-2xl font-medium">
                No external media found for this title.
              </p>
            )}
          </div>
        </div>
      </div>

      {steamData?.short_description && (
        <div className="relative z-10 bg-[#030303] w-full pt-10 px-12">
          <div className="max-w-[1400px] mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-black/40 backdrop-blur-[40px] border border-white/10 p-10 rounded-3xl w-full shadow-2xl"
            >
              <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-white uppercase tracking-widest">
                <Info className="text-gray-400" size={24} /> About Game
              </h3>
              <p
                dangerouslySetInnerHTML={{
                  __html: steamData.short_description,
                }}
                className="text-gray-200 leading-relaxed text-base max-w-5xl"
              />
            </motion.div>
          </div>
        </div>
      )}
    </>
  );
}
