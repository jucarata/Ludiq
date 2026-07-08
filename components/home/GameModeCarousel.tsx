"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const GAME_MODES = [
  {
    id: "multiplayer",
    title: "Multiplayer",
    image: `${basePath}/images/game_preview.jpeg`,
  },
  {
    id: "offline",
    title: "Play Offline",
    image: `${basePath}/images/game_preview.jpeg`,
  },
] as const;

const CARD_WIDTH_CLASS = "w-[15rem] sm:w-[16.5rem]";
const CAROUSEL_PADDING_CLASS = "px-[calc((100%-15rem)/2)] sm:px-[calc((100%-16.5rem)/2)]";

export function GameModeCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    scrollStart: 0,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const getCards = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return [];

    return Array.from(
      container.querySelectorAll<HTMLElement>("[data-mode-card]"),
    );
  }, []);

  const getClosestIndex = useCallback(() => {
    const container = scrollRef.current;
    const cards = getCards();
    if (!container || cards.length === 0) return 0;

    const viewportCenter = container.scrollLeft + container.clientWidth / 2;

    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(viewportCenter - cardCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  }, [getCards]);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const container = scrollRef.current;
      const cards = getCards();
      const card = cards[index];
      if (!container || !card) return;

      const targetLeft = Math.max(
        0,
        card.offsetLeft + card.offsetWidth / 2 - container.clientWidth / 2,
      );

      container.scrollTo({ left: targetLeft, behavior });
      setActiveIndex(index);
    },
    [getCards],
  );

  const snapToClosest = useCallback(() => {
    scrollToIndex(getClosestIndex());
  }, [getClosestIndex, scrollToIndex]);

  useLayoutEffect(() => {
    scrollToIndex(0, "auto");
  }, [scrollToIndex]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let frame = 0;

    const handleScroll = () => {
      if (dragRef.current.active) return;

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setActiveIndex(getClosestIndex());
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener("scroll", handleScroll);
    };
  }, [getClosestIndex]);

  const endDrag = useCallback(() => {
    const container = scrollRef.current;
    if (!container || !dragRef.current.active) return;

    dragRef.current.active = false;
    setIsDragging(false);
    container.style.scrollSnapType = "x mandatory";
    container.style.scrollBehavior = "smooth";
    snapToClosest();
  }, [snapToClosest]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    if (
      !container ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }

    event.preventDefault();

    const pointerId = event.pointerId;
    dragRef.current = {
      active: true,
      pointerId,
      startX: event.clientX,
      scrollStart: container.scrollLeft,
    };

    setIsDragging(true);
    container.style.scrollSnapType = "none";
    container.style.scrollBehavior = "auto";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (
        !dragRef.current.active ||
        moveEvent.pointerId !== pointerId ||
        !scrollRef.current
      ) {
        return;
      }

      moveEvent.preventDefault();
      scrollRef.current.scrollLeft =
        dragRef.current.scrollStart +
        (dragRef.current.startX - moveEvent.clientX);
    };

    const handlePointerEnd = (endEvent: PointerEvent) => {
      if (endEvent.pointerId !== pointerId) return;

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      endDrag();
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
  };

  const activeMode = GAME_MODES[activeIndex];

  return (
    <main className="flex h-dvh flex-col items-center justify-center px-4 pb-8">
      <div className="w-full">
        <div
          ref={scrollRef}
          onPointerDown={handlePointerDown}
          className={`flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden scroll-smooth touch-pan-x overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${CAROUSEL_PADDING_CLASS} ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
            {GAME_MODES.map((mode, index) => {
              const isActive = activeIndex === index;

              return (
                <article
                  key={mode.id}
                  data-mode-card
                  data-index={index}
                  aria-label={mode.title}
                  aria-current={isActive ? "true" : undefined}
                  className={`relative ${CARD_WIDTH_CLASS} aspect-[9/16] shrink-0 snap-center overflow-hidden rounded-[1.75rem] border-2 bg-[#252540] shadow-[0_18px_40px_rgba(0,0,0,0.35)] transition-[transform,border-color] duration-300 select-none ${
                    isActive
                      ? "scale-100 border-[var(--board-path-border)]/50"
                      : "scale-[0.96] border-[var(--board-path-border)]/20"
                  }`}
                >
                  <img
                    src={mode.image}
                    alt={mode.title}
                    className="pointer-events-none h-full w-full object-cover object-top"
                    draggable={false}
                  />

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1a1a2e]/90 via-[#1a1a2e]/20 to-transparent" />

                  <div
                    className={`pointer-events-none absolute inset-0 bg-[#0a0a14] transition-opacity duration-300 ${
                      isActive ? "opacity-0" : "opacity-45"
                    }`}
                    aria-hidden
                  />

                  <h2
                    className={`absolute inset-x-0 bottom-0 px-4 pb-4 text-2xl font-black uppercase tracking-wide transition-opacity duration-300 sm:text-3xl ${
                      isActive
                        ? "text-[var(--board-path)] opacity-100"
                        : "text-[var(--board-path)] opacity-75"
                    }`}
                  >
                    {mode.title}
                  </h2>
                </article>
              );
            })}
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-3">
        <div
          className="flex items-center gap-2"
          role="tablist"
          aria-label="Game modes"
        >
          {GAME_MODES.map((mode, index) => (
            <button
              key={mode.id}
              type="button"
              role="tab"
              aria-selected={activeIndex === index}
              aria-label={mode.title}
              onClick={() => scrollToIndex(index)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                activeIndex === index
                  ? "w-8 bg-[var(--board-green)]"
                  : "w-2.5 bg-[var(--board-path-border)]/50 hover:bg-[var(--board-path-border)]"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          aria-label={`Play ${activeMode.title}`}
          className="rounded-full bg-[var(--board-green)] px-14 py-4 text-xl font-bold uppercase tracking-widest text-[var(--board-path)] shadow-lg transition-transform hover:scale-105 hover:bg-[var(--board-green-dark)] active:scale-95"
        >
          Play
        </button>
      </div>
    </main>
  );
}
