import { Player } from "@remotion/player";
import { useCurrentFrame, useVideoConfig, spring, interpolate, Sequence, AbsoluteFill, Easing } from "remotion";
import { ArrowRightLeft, ReceiptText, Zap, LinkIcon } from "lucide-react";
import { Card, Button, Badge } from "~/components/ui";
import type { ReactNode } from "react";

// The phone wrapper from home.tsx, adapted for the video
function PhoneMockup({ children, scale = 1, yOffset = 0 }: { children: ReactNode; scale?: number; yOffset?: number }) {
  return (
    <div style={{ transform: `scale(${scale}) translateY(${yOffset}px)`, willChange: "transform" }}>
      <div
        style={{
          background: "#1c1c1e",
          borderRadius: 40,
          boxShadow:
            "0 30px 70px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08)",
          flexShrink: 0,
          padding: "12px",
          width: 280,
          transform: "perspective(1px) translateZ(0)",
          backfaceVisibility: "hidden",
          WebkitFontSmoothing: "antialiased"
        }}
      >
        {/* Dynamic island */}
        <div className="flex items-center justify-center h-6">
          <div className="bg-black rounded-lg h-3 w-20" />
        </div>

        {/* Screen */}
        <div
          className="bg-neutral-50 dark:bg-neutral-900 p-4 min-h-[500px] flex flex-col mt-2"
          style={{
            borderRadius: 32,
            overflow: "hidden",
            WebkitMaskImage: "-webkit-radial-gradient(white, black)",
            transform: "perspective(1px) translateZ(0)",
            backfaceVisibility: "hidden"
          }}
        >
          {children}
        </div>

        {/* Home indicator */}
        <div className="flex items-center justify-center h-6 mt-1">
          <div className="bg-neutral-600 rounded-full h-1 w-20" />
        </div>
      </div>
    </div>
  );
}

export function PromoVideoContent() {
  const { fps } = useVideoConfig();

  // Scene 1: Create Group UI (0s to 2.5s)
  // Scene 2: Link Share & Member View (2s to 4.5s)
  // Scene 3: Add Expense UI (4s to 6.5s)
  // Scene 4: Settle Up (Balances) (6s to 8.5s)

  return (
    <AbsoluteFill className="promo-video-root bg-neutral-100 dark:bg-neutral-950 items-center justify-center overflow-hidden">
      <style>{`
        /* FORBIDDEN: CSS transitions cause artifacts in Remotion rendering. */
        .promo-video-root, .promo-video-root * {
          transition: none !important;
          animation: none !important;
        }
      `}</style>
      <Sequence from={0} durationInFrames={2.5 * fps}>
        <IntroScene />
      </Sequence>
      <Sequence from={2 * fps} durationInFrames={2.5 * fps}>
        <LinkScene />
      </Sequence>
      <Sequence from={4 * fps} durationInFrames={2.5 * fps}>
        <ExpenseScene />
      </Sequence>
      <Sequence from={6 * fps} durationInFrames={2.5 * fps}>
        <SettleScene />
      </Sequence>
    </AbsoluteFill>
  );
}

function IntroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 20, stiffness: 200 } }); // snappy
  const opacity = interpolate(frame, [0, 15, fps * 2.5 - 15, fps * 2.5], [0, 1, 1, 0], { easing: Easing.inOut(Easing.quad), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const inputTyping = interpolate(frame, [15, 45], [0, 13], { easing: Easing.out(Easing.quad), extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const cursorBlink = Math.floor(frame / 15) % 2 === 0 ? 1 : 0;

  const text = "Ski Trip 2026";
  const typedText = text.substring(0, Math.floor(inputTyping));

  return (
    <AbsoluteFill className="items-center justify-center" style={{ opacity }}>
      <div style={{ transform: `scale(${scale})`, display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 400 }}>
        <div className="flex items-center gap-2 mb-8 text-3xl font-bold dark:text-white">
          <Zap size={32} className="text-olive-600 dark:text-olive-400" />
          SplitSend
        </div>

        <Card className="w-full shadow-2xl !transition-none">
          <fieldset disabled style={{ border: 0, padding: 0, margin: 0 }}>
            <label className="block text-sm font-semibold mb-2 dark:text-white">Name your group</label>
            <div className="w-full py-3 px-4 border border-mauve-200 dark:border-neutral-700 rounded-2xl bg-white dark:bg-neutral-900 text-mauve-950 dark:text-white text-base !transition-none">
              {typedText || <span className="text-mauve-400">e.g. "Ski Trip 2026"</span>}
              <span className="inline-block w-[2px] h-[1em] bg-olive-700 ml-[1px] align-middle" style={{ opacity: cursorBlink }} />
            </div>
            <Button className="w-full mt-4 flex items-center justify-center gap-2 !transition-none" $size="default">
              Create Group <span className="opacity-70">(it's free)</span>
            </Button>
          </fieldset>
        </Card>
      </div>
    </AbsoluteFill>
  );
}

function LinkScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterY = spring({ frame, fps, config: { damping: 15, stiffness: 80, mass: 2 } }); // heavy
  const opacity = interpolate(frame, [0, 10, fps * 2.5 - 10, fps * 2.5], [0, 1, 1, 0], { easing: Easing.bezier(0.8, 0, 0.2, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill className="items-center justify-center" style={{ opacity }}>
      <div style={{ transform: `translateY(${(1 - enterY) * 60}px)`, display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 400 }}>
        <Card className="w-full shadow-2xl text-center border-olive-500/30 !transition-none">
          <div className="mx-auto w-12 h-12 bg-olive-100 dark:bg-olive-900/40 rounded-full flex items-center justify-center mb-4 !transition-none">
            <LinkIcon size={24} className="text-olive-700 dark:text-olive-400" />
          </div>
          <h2 className="text-xl font-bold mb-2 dark:text-white">Share your private link</h2>
          <p className="text-mauve-500 dark:text-neutral-400 text-sm mb-6">
            No accounts, no downloads. Just send this link to your group.
          </p>

          <div className="flex gap-2">
            <div className="flex-1 overflow-hidden py-2 px-3 border border-mauve-200 dark:border-neutral-700 rounded-xl bg-mauve-50 dark:bg-neutral-800 text-sm font-mono text-left whitespace-nowrap dark:text-white !transition-none">
              splitsend.app/g/ski...
            </div>
            <Button $variant="primary" className="py-2 px-4 whitespace-nowrap !transition-none">
              Copy Link
            </Button>
          </div>
        </Card>
      </div>
    </AbsoluteFill>
  );
}

function ExpenseScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterScale = spring({ frame, fps, config: { damping: 20, stiffness: 100 } }); // smooth
  const opacity = interpolate(frame, [0, 10, fps * 2.5 - 10, fps * 2.5], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Staggered list items using Easing
  const item1 = interpolate(frame - 15, [0, 20], [0, 1], { easing: Easing.out(Easing.exp), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const item2 = interpolate(frame - 25, [0, 20], [0, 1], { easing: Easing.out(Easing.exp), extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill className="items-center justify-center" style={{ opacity }}>
      <PhoneMockup scale={0.9 + (enterScale * 0.1)} yOffset={(1 - enterScale) * 50}>
        <div className="text-xs text-mauve-400 mb-1">← SplitSend</div>
        <div className="font-bold text-lg mb-4 dark:text-white">Ski Trip 2026</div>

        <Card className="p-4 shadow-sm border-mauve-100 dark:border-neutral-800 flex-1 flex flex-col !transition-none">
          <div className="font-bold mb-4 flex items-center gap-2 dark:text-white">
            <ReceiptText size={16} className="text-olive-600" />
            Expenses
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center py-2 border-b border-mauve-100 dark:border-neutral-800">
              <div className="flex flex-col">
                <span className="font-medium text-sm dark:text-white">Airbnb deposit</span>
                <span className="text-xs text-mauve-500">Paid by Mike</span>
              </div>
              <span className="font-bold dark:text-white">$450.00</span>
            </div>

            <div style={{ transform: `translateX(${(1 - item1) * -30}px)`, opacity: item1 }} className="flex justify-between items-center py-2 border-b border-mauve-100 dark:border-neutral-800">
              <div className="flex flex-col">
                <span className="font-medium text-sm dark:text-white">Lift tickets</span>
                <span className="text-xs text-mauve-500">Paid by Sarah</span>
              </div>
              <span className="font-bold dark:text-white">$280.00</span>
            </div>

            <div style={{ transform: `translateX(${(1 - item2) * -30}px)`, opacity: item2 }} className="flex justify-between items-center py-2 border-b border-mauve-100 dark:border-neutral-800">
              <div className="flex flex-col">
                <span className="font-medium text-sm dark:text-white">Groceries</span>
                <span className="text-xs text-mauve-500">Paid by Alex</span>
              </div>
              <span className="font-bold dark:text-white">$135.00</span>
            </div>
          </div>

          <Button className="w-full mt-auto py-3 text-sm flex items-center justify-center gap-2 !transition-none">
            Add Expense
          </Button>
        </Card>
      </PhoneMockup>
    </AbsoluteFill>
  );
}

function SettleScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterScale = spring({ frame, fps, config: { damping: 12, stiffness: 150 } });
  const opacity = interpolate(frame, [0, 10, fps * 2.5 - 10, fps * 2.5], [0, 1, 1, 0], { easing: Easing.inOut(Easing.quad), extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Payment animations
  const pay1 = spring({ frame: frame - 15, fps, config: { damping: 10, mass: 0.8 } }); // bouncy
  const pay2 = spring({ frame: frame - 25, fps, config: { damping: 10, mass: 0.8 } });

  return (
    <AbsoluteFill className="items-center justify-center" style={{ opacity }}>
      <PhoneMockup scale={0.9 + (enterScale * 0.1)} yOffset={(1 - enterScale) * 50}>
        <div className="text-xs text-mauve-400 mb-1">← SplitSend</div>
        <div className="font-bold text-lg mb-4 dark:text-white">Ski Trip 2026</div>

        <Card className="p-4 shadow-sm border-emerald-200 dark:border-emerald-900/30 flex-1 flex flex-col !transition-none">
          <div className="font-bold mb-4 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <ArrowRightLeft size={16} />
            Settle Up
          </div>

          <Badge $variant="success" className="self-start mb-6 !transition-none">Optimized</Badge>

          <div className="flex flex-col gap-4">
            <div style={{ transform: `scale(${0.9 + (pay1 * 0.1)})`, opacity: pay1 }} className="bg-mauve-50 dark:bg-neutral-800 p-3 rounded-2xl flex items-center justify-between border border-emerald-100 dark:border-emerald-900/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">A</div>
                <div className="flex flex-col">
                  <span className="text-xs text-mauve-500 flex items-center gap-1">Alex pays <ArrowRightLeft size={10} /></span>
                  <span className="font-semibold text-sm dark:text-white">Mike</span>
                </div>
              </div>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">$65.00</span>
            </div>

            <div style={{ transform: `scale(${0.9 + (pay2 * 0.1)})`, opacity: pay2 }} className="bg-mauve-50 dark:bg-neutral-800 p-3 rounded-2xl flex items-center justify-between border border-emerald-100 dark:border-emerald-900/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">S</div>
                <div className="flex flex-col">
                  <span className="text-xs text-mauve-500 flex items-center gap-1">Sarah pays <ArrowRightLeft size={10} /></span>
                  <span className="font-semibold text-sm dark:text-white">Mike</span>
                </div>
              </div>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">$105.00</span>
            </div>
          </div>
        </Card>
      </PhoneMockup>
    </AbsoluteFill>
  );
}

export function PromoVideoPlayer() {
  return (
    <div className="w-full max-w-2xl mx-auto rounded-3xl overflow-hidden shadow-2xl mb-12" style={{ aspectRatio: "16 / 9" }}>
      <Player
        component={PromoVideoContent}
        durationInFrames={30 * 8.5}
        compositionWidth={1280}
        compositionHeight={720}
        fps={30}
        style={{ width: "100%", height: "100%" }}
        controls={false}
        autoPlay
        loop
      />
    </div>
  );
}
