"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useHomePlay } from "@/components/home/HomePlayContext";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const GAME_MODES = [
  {
    id: "multiplayer",
    titleKey: "home.multiplayer" as const satisfies MessageKey,
    image: `${basePath}/images/game_preview.jpeg`,
  },
  {
    id: "local",
    titleKey: "home.playLocal" as const satisfies MessageKey,
    image: `${basePath}/images/game_preview.jpeg`,
  },
] as const;

const CARD_CLASS =
  "h-[min(70dvh,calc(100dvh-8.5rem-env(safe-area-inset-bottom,0px)))] w-auto max-w-[70vw] aspect-[9/16] sm:h-auto sm:w-[16.5rem] sm:max-w-none";

const CAROUSEL_PADDING_CLASS =
  "px-[calc((100%-min(70vw,calc(min(70dvh,calc(100dvh-8.5rem-env(safe-area-inset-bottom,0px)))*9/16)))/2)] sm:px-[calc((100%-16.5rem)/2)]";

export function GameModeCarousel() {
  const { setActiveMode } = useHomePlay();
  const { t } = useTranslations();
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
  const activeTitle = t(activeMode.titleKey);

  useEffect(() => {
    setActiveMode({
      id: activeMode.id,
      title: activeTitle,
    });
  }, [activeMode.id, activeTitle, setActiveMode]);

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-end pb-10 sm:justify-center sm:pb-0">
        <div className="flex w-full flex-col items-center gap-3">
          <div
            ref={scrollRef}
            onPointerDown={handlePointerDown}
            className={`flex w-full snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden scroll-smooth touch-pan-x overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${CAROUSEL_PADDING_CLASS} ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            {GAME_MODES.map((mode, index) => {
              const isActive = activeIndex === index;
              const title = t(mode.titleKey);

              return (
                <article
                  key={mode.id}
                  data-mode-card
                  data-index={index}
                  aria-label={title}
                  aria-current={isActive ? "true" : undefined}
                  className={`relative ${CARD_CLASS} shrink-0 snap-center overflow-hidden rounded-[1.75rem] border-2 bg-[#252540] shadow-[0_18px_40px_rgba(0,0,0,0.35)] transition-[transform,border-color] duration-300 select-none ${
                    isActive
                      ? "scale-100 border-[var(--board-path-border)]/50"
                      : "scale-[0.96] border-[var(--board-path-border)]/20"
                  }`}
                >
                  <img
                    src={mode.image}
                    alt={title}
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
                    {title}
                  </h2>
                </article>
              );
            })}
          </div>

          <div
            className="flex items-center gap-2"
            role="tablist"
            aria-label={t("home.gameModes")}
          >
            {GAME_MODES.map((mode, index) => (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={activeIndex === index}
                aria-label={t(mode.titleKey)}
                onClick={() => scrollToIndex(index)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  activeIndex === index
                    ? "w-8 bg-[var(--board-green)]"
                    : "w-2.5 bg-[var(--board-path-border)]/50 hover:bg-[var(--board-path-border)]"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
