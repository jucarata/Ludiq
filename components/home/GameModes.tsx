"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import {
  ModeArt,
  MODE_ACCENTS,
  MODE_SCRIMS,
  type GameModeId,
} from "@/components/home/ModeVisual";
import { OnboardingTutorial } from "@/components/tutorial/OnboardingTutorial";
import { brandBodyFont, brandTitleFont } from "@/lib/fonts";
import type { MessageKey } from "@/lib/i18n";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type GameMode = {
  id: GameModeId;
  titleKey: MessageKey;
  subtitleKey: MessageKey;
  href: string | null;
  accent: string;
};

const GAME_MODES: GameMode[] = [
  {
    id: "versus",
    titleKey: "home.versus",
    subtitleKey: "home.versusSubtitle",
    href: null,
    accent: MODE_ACCENTS.versus,
  },
  {
    id: "friends",
    titleKey: "home.friends",
    subtitleKey: "home.friendsSubtitle",
    href: "/friends",
    accent: MODE_ACCENTS.friends,
  },
  {
    id: "practice",
    titleKey: "home.practice",
    subtitleKey: "home.practiceSubtitle",
    href: "/play",
    accent: MODE_ACCENTS.practice,
  },
];

const CARD_CLASS =
  "h-[min(48dvh,calc(100dvh-14rem-env(safe-area-inset-bottom,0px)))] w-auto max-w-[68vw] aspect-[3/4] sm:h-auto sm:w-[14.5rem] sm:max-w-none";

const CAROUSEL_PADDING_CLASS =
  "px-[calc((100%-min(68vw,calc(min(48dvh,calc(100dvh-14rem-env(safe-area-inset-bottom,0px)))*3/4)))/2)] sm:px-[calc((100%-14.5rem)/2)]";

function ModeCardFace({
  mode,
  isActive,
  title,
  subtitle,
  comingSoon,
}: {
  mode: GameMode;
  isActive: boolean;
  title: string;
  subtitle: string;
  comingSoon: string;
}) {
  const disabled = mode.href === null;

  return (
    <>
      <ModeArt modeId={mode.id} />

      <div
        className={`pointer-events-none absolute inset-0 ${MODE_SCRIMS[mode.id]}`}
      />

      {!isActive && (
        <div
          className="pointer-events-none absolute inset-0 bg-[#080a24]/45 transition-opacity duration-300"
          aria-hidden
        />
      )}

      {disabled && (
        <span
          className={`${brandBodyFont.className} absolute left-1/2 top-4 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-[var(--brand-navy)] bg-[var(--brand-cream)] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-[var(--brand-navy)]/70 shadow-md sm:text-xs`}
        >
          {comingSoon}
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-5 pt-10 text-center">
        <h2
          className={`${brandTitleFont.className} text-[1.45rem] font-extrabold leading-none tracking-wide text-[var(--brand-cream)] sm:text-[1.75rem]`}
          style={{ textShadow: "0 3px 0 var(--brand-navy)" }}
        >
          {title}
        </h2>
        <p
          className={`${brandBodyFont.className} mt-1.5 text-sm font-semibold text-[var(--brand-cream)]/75 sm:text-[0.95rem]`}
        >
          {subtitle}
        </p>
      </div>
    </>
  );
}

export function GameModes() {
  const { t } = useTranslations();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    scrollStart: 0,
    moved: false,
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
      moved: false,
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

      const dx = dragRef.current.startX - moveEvent.clientX;
      if (Math.abs(dx) > 6) {
        dragRef.current.moved = true;
      }

      moveEvent.preventDefault();
      scrollRef.current.scrollLeft = dragRef.current.scrollStart + dx;
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

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <OnboardingTutorial />
      <div className="flex shrink-0 flex-col items-center px-5 pt-3 sm:pt-4">
        <img
          src={`${basePath}/images/partyk-logo-color.png`}
          alt="Partyk"
          className="brand-logo-float h-auto w-[min(78vw,17.5rem)] object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.35)] sm:w-[19rem]"
          draggable={false}
        />
        <p
          className={`${brandTitleFont.className} mt-1.5 text-center text-base font-extrabold tracking-wide text-[var(--brand-cream)]/85 sm:text-lg`}
          style={{ textShadow: "0 2px 0 rgba(20,23,77,0.65)" }}
        >
          {t("home.chooseMode")}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-end pb-8 sm:justify-center sm:pb-4">
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
              const subtitle = t(mode.subtitleKey);
              const disabled = mode.href === null;
              const cardShell = `relative ${CARD_CLASS} shrink-0 snap-center overflow-hidden rounded-[1.75rem] border-[3px] border-[var(--brand-navy)] shadow-[0_14px_0_rgba(20,23,77,0.85)] transition-[transform,filter] duration-300 select-none ${
                isActive ? "scale-100" : "scale-[0.94] brightness-90"
              } ${disabled ? "grayscale-[0.25] opacity-80" : ""}`;

              const face = (
                <ModeCardFace
                  mode={mode}
                  isActive={isActive}
                  title={title}
                  subtitle={subtitle}
                  comingSoon={t("nav.comingSoon")}
                />
              );

              if (disabled) {
                return (
                  <article
                    key={mode.id}
                    data-mode-card
                    data-index={index}
                    aria-label={`${title}. ${t("nav.comingSoon")}`}
                    aria-current={isActive ? "true" : undefined}
                    aria-disabled="true"
                    className={cardShell}
                  >
                    {face}
                  </article>
                );
              }

              return (
                <Link
                  key={mode.id}
                  href={mode.href!}
                  data-mode-card
                  data-index={index}
                  aria-label={title}
                  aria-current={isActive ? "true" : undefined}
                  className={cardShell}
                  onClick={(event) => {
                    if (dragRef.current.moved) {
                      event.preventDefault();
                    }
                  }}
                  draggable={false}
                >
                  {face}
                </Link>
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
                className={`h-2.5 rounded-full border-2 border-[var(--brand-navy)] transition-all duration-300 ${
                  activeIndex === index ? "w-8" : "w-2.5 opacity-60"
                }`}
                style={{
                  backgroundColor:
                    activeIndex === index ? mode.accent : "var(--brand-cream)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
