"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { FaHeart, FaStar } from "react-icons/fa6";
import { DieFace } from "@/components/dice/DieFace";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { brandBodyFont, brandTitleFont } from "@/lib/fonts";
import type { MessageKey } from "@/lib/i18n";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type GameModeId = "versus" | "friends" | "practice";

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
    accent: "#FF4B6E",
  },
  {
    id: "friends",
    titleKey: "home.friends",
    subtitleKey: "home.friendsSubtitle",
    href: "/friends",
    accent: "#2ECC71",
  },
  {
    id: "practice",
    titleKey: "home.practice",
    subtitleKey: "home.practiceSubtitle",
    href: "/play",
    accent: "#FFC800",
  },
];

const MODE_BACKGROUNDS: Record<GameModeId, string> = {
  versus: `
    radial-gradient(circle at 50% 30%, rgba(255,200,11,0.28), transparent 50%),
    linear-gradient(165deg, #FF4B6E 0%, #E63946 42%, #9B1C2E 100%)
  `,
  friends: `
    radial-gradient(circle at 50% 30%, rgba(255,255,255,0.22), transparent 50%),
    linear-gradient(165deg, #3DDB86 0%, #2ECC71 42%, #1B8A4A 100%)
  `,
  practice: `
    radial-gradient(circle at 50% 30%, rgba(255,255,255,0.28), transparent 50%),
    linear-gradient(165deg, #FFD84A 0%, #FFC800 42%, #D97706 100%)
  `,
};

const MODE_SCRIMS: Record<GameModeId, string> = {
  versus: "bg-gradient-to-t from-[#7A1524] via-[#7A1524]/50 to-transparent",
  friends: "bg-gradient-to-t from-[#0F5C32] via-[#0F5C32]/50 to-transparent",
  practice: "bg-gradient-to-t from-[#8A4B08] via-[#8A4B08]/50 to-transparent",
};

const CARD_CLASS =
  "h-[min(48dvh,calc(100dvh-14rem-env(safe-area-inset-bottom,0px)))] w-auto max-w-[68vw] aspect-[3/4] sm:h-auto sm:w-[14.5rem] sm:max-w-none";

const CAROUSEL_PADDING_CLASS =
  "px-[calc((100%-min(68vw,calc(min(48dvh,calc(100dvh-14rem-env(safe-area-inset-bottom,0px)))*3/4)))/2)] sm:px-[calc((100%-14.5rem)/2)]";

function ModeBadgeShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-[9.5rem] w-[11.5rem] flex-col items-center justify-center sm:h-[11.5rem] sm:w-[13.5rem]">
      {children}
    </div>
  );
}

function MiniBoardBackdrop() {
  return (
    <div
      className="absolute left-1/2 top-[6%] h-[72%] w-[78%] -translate-x-1/2 overflow-hidden rounded-2xl border-[3px] border-white/80 shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
      style={{ backgroundColor: "#FFF8F0" }}
      aria-hidden
    >
      <div className="absolute left-1/2 top-[10%] h-[80%] w-[24%] -translate-x-1/2 rounded-sm bg-[#EDE6D8]" />
      <div className="absolute left-[10%] top-1/2 h-[24%] w-[80%] -translate-y-1/2 rounded-sm bg-[#EDE6D8]" />
      <span className="absolute left-[8%] top-[8%] h-[30%] w-[30%] rounded-md bg-[#FF4B6E]" />
      <span className="absolute right-[8%] top-[8%] h-[30%] w-[30%] rounded-md bg-[#FFC800]" />
      <span className="absolute bottom-[8%] left-[8%] h-[30%] w-[30%] rounded-md bg-[#2ECC71]" />
      <span className="absolute bottom-[8%] right-[8%] h-[30%] w-[30%] rounded-md bg-[#00C2FF]" />
      <span className="absolute left-1/2 top-1/2 h-[16%] w-[16%] -translate-x-1/2 -translate-y-1/2 rounded-sm bg-[#6A3DF3]" />
    </div>
  );
}

function SoftGlow({ color }: { color: string }) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-[42%] h-24 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-md"
      style={{
        background: `radial-gradient(circle, ${color}, transparent 70%)`,
      }}
      aria-hidden
    />
  );
}

/** Glossy gold-outlined duel mark — like mobile “VS” screens, with 1s instead of people */
function VersusStickerText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <span
      className={`${brandTitleFont.className} relative inline-block font-extrabold leading-none ${className ?? ""}`}
      style={{
        color: "#6A3DF3",
        WebkitTextStroke: "0.12em #FFC800",
        paintOrder: "stroke fill",
        textShadow:
          "0 0.08em 0 #B45309, 0 0.14em 0 #14174D, 0 0.22em 0.18em rgba(0,0,0,0.35)",
      }}
    >
      {children}
    </span>
  );
}

function VersusBadge() {
  return (
    <ModeBadgeShell>
      <MiniBoardBackdrop />
      <SoftGlow color="rgba(255,200,11,0.45)" />

      <div className="relative z-10 flex items-end justify-center gap-0.5 sm:gap-1">
        <VersusStickerText className="-rotate-6 text-[3.4rem] sm:text-[4.1rem]">
          1
        </VersusStickerText>
        <VersusStickerText className="mb-1 text-[2.55rem] sm:mb-1.5 sm:text-[3.1rem]">
          VS
        </VersusStickerText>
        <VersusStickerText className="rotate-6 text-[3.4rem] sm:text-[4.1rem]">
          1
        </VersusStickerText>
      </div>

      <div className="relative z-10 mt-1 flex items-end gap-1 sm:mt-1.5 sm:gap-1.5">
        <DieFace
          value={2}
          className="h-7 w-7 -rotate-12 drop-shadow-[0_3px_0_rgba(20,23,77,0.45)] sm:h-8 sm:w-8"
        />
        <DieFace
          value={5}
          className="h-7 w-7 -translate-y-1 rotate-6 drop-shadow-[0_3px_0_rgba(20,23,77,0.45)] sm:h-8 sm:w-8"
        />
        <DieFace
          value={1}
          className="h-7 w-7 rotate-[14deg] drop-shadow-[0_3px_0_rgba(20,23,77,0.45)] sm:h-8 sm:w-8"
        />
      </div>
    </ModeBadgeShell>
  );
}

function FriendsBadge() {
  return (
    <ModeBadgeShell>
      <MiniBoardBackdrop />
      <SoftGlow color="rgba(255,255,255,0.4)" />

      <div className="relative z-10 flex items-center justify-center">
        <FaHeart
          className="absolute -left-7 top-2 h-8 w-8 -rotate-[18deg] text-[#FF4B6E] drop-shadow-[0_3px_0_rgba(20,23,77,0.4)] sm:-left-8 sm:h-9 sm:w-9"
          aria-hidden
        />
        <FaHeart
          className="h-[4.25rem] w-[4.25rem] text-white drop-shadow-[0_5px_0_rgba(20,23,77,0.45)] sm:h-[5rem] sm:w-[5rem]"
          style={{
            filter: "drop-shadow(0 0 0.15rem #FFC800)",
          }}
          aria-hidden
        />
        <FaHeart
          className="absolute -right-7 bottom-1 h-8 w-8 rotate-[16deg] text-[#00C2FF] drop-shadow-[0_3px_0_rgba(20,23,77,0.4)] sm:-right-8 sm:h-9 sm:w-9"
          aria-hidden
        />
      </div>
    </ModeBadgeShell>
  );
}

function PracticeBadge() {
  return (
    <ModeBadgeShell>
      <MiniBoardBackdrop />
      <SoftGlow color="rgba(255,255,255,0.42)" />

      <div className="relative z-10 flex items-center justify-center">
        <DieFace
          value={5}
          className="h-[4.1rem] w-[4.1rem] -rotate-12 drop-shadow-[0_6px_0_rgba(20,23,77,0.4)] sm:h-[4.75rem] sm:w-[4.75rem]"
        />
        <DieFace
          value={2}
          className="absolute left-[52%] top-[8%] h-[3.4rem] w-[3.4rem] rotate-[18deg] drop-shadow-[0_5px_0_rgba(20,23,77,0.4)] sm:h-[4rem] sm:w-[4rem]"
        />
      </div>

      <div className="relative z-10 mt-1.5 flex items-center gap-1.5 sm:mt-2">
        <FaStar
          className="h-5 w-5 -rotate-12 text-white drop-shadow-[0_2px_0_rgba(20,23,77,0.4)] sm:h-6 sm:w-6"
          aria-hidden
        />
        <span
          className={`${brandTitleFont.className} text-[1.35rem] font-extrabold leading-none tracking-wide text-white sm:text-[1.55rem]`}
          style={{
            WebkitTextStroke: "0.06em #14174D",
            paintOrder: "stroke fill",
            textShadow: "0 0.1em 0 rgba(20,23,77,0.45)",
          }}
        >
          SOLO
        </span>
        <FaStar
          className="h-5 w-5 rotate-12 text-white drop-shadow-[0_2px_0_rgba(20,23,77,0.4)] sm:h-6 sm:w-6"
          aria-hidden
        />
      </div>
    </ModeBadgeShell>
  );
}

function ModeArt({ mode }: { mode: GameMode }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-5">
      <div
        className="absolute inset-0"
        style={{ background: MODE_BACKGROUNDS[mode.id] }}
      />

      <div className="relative z-10">
        {mode.id === "versus" && <VersusBadge />}
        {mode.id === "friends" && <FriendsBadge />}
        {mode.id === "practice" && <PracticeBadge />}
      </div>
    </div>
  );
}

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
      <ModeArt mode={mode} />

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
