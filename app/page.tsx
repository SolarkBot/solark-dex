"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { ImmersiveSwapScene } from "@/components/immersive/ImmersiveSwapScene";
import { FloatingSwapControls } from "@/components/ui/FloatingSwapControls";
import { WalletButton } from "@/components/ui/WalletButton";
import { usePrefersDarkMode } from "@/hooks/usePrefersDarkMode";
import { useSwapFlow } from "@/hooks/useSwapFlow";

export default function Page() {
  const swapFlow = useSwapFlow();
  const { connected } = useWallet();
  const prefersDarkMode = usePrefersDarkMode();

  return (
    <main className="immersive-shell relative min-h-[100dvh] overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <div className="absolute inset-0">
        <ImmersiveSwapScene
          amount={swapFlow.amount}
          availableTokens={swapFlow.availableTokens}
          darkMode={prefersDarkMode}
          fromToken={swapFlow.fromToken}
          phase={swapFlow.phase}
          quote={swapFlow.quote}
          receipt={swapFlow.receipt}
          selectedMints={swapFlow.selectedMints}
          sequenceId={swapFlow.sequenceId}
          toToken={swapFlow.toToken}
        />
      </div>

      <div className="scene-vignette pointer-events-none absolute inset-0" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 px-4 pb-8 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
        <div className="ml-auto pointer-events-auto">
          <WalletButton />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-[5.9rem] z-20 flex justify-center px-4 sm:top-[6.8rem]">
        <div className="hud-chip rounded-full px-4 py-2 font-label text-[10px] uppercase tracking-[0.3em] text-[var(--muted)]">
          {swapFlow.phaseLabel}
        </div>
      </div>

      <div className="swap-dock">
        <div className="swap-dock-panel pointer-events-auto w-full max-w-[20rem] sm:max-w-[24rem] lg:max-w-[36rem]">
          <FloatingSwapControls
            amount={swapFlow.amount}
            availableTokens={swapFlow.availableTokens}
            canSwap={swapFlow.canSwap && connected}
            connected={connected}
            error={swapFlow.error}
            fromCustomInput={swapFlow.fromCustomInput}
            fromToken={swapFlow.fromToken}
            onAmountChange={swapFlow.setAmount}
            onFromChange={swapFlow.onFromTokenChange}
            onFromCustomInputChange={swapFlow.setFromCustomInput}
            onResolveFromCustom={swapFlow.resolveFromCustom}
            onResolveToCustom={swapFlow.resolveToCustom}
            onSwap={swapFlow.beginSwap}
            onToChange={swapFlow.onToTokenChange}
            onToCustomInputChange={swapFlow.setToCustomInput}
            phase={swapFlow.phase}
            receipt={swapFlow.receipt}
            resolvingFromCustom={swapFlow.resolvingFromCustom}
            resolvingToCustom={swapFlow.resolvingToCustom}
            showFromCustomInput={swapFlow.showFromCustomInput}
            showToCustomInput={swapFlow.showToCustomInput}
            status={swapFlow.status}
            toCustomInput={swapFlow.toCustomInput}
            toToken={swapFlow.toToken}
          />
        </div>
      </div>
    </main>
  );
}
