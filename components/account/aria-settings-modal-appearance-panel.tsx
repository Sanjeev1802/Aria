"use client";

import { AriaThemeSwitch } from "@/components/account/aria-theme-switch";
import {
  SettingsBlock,
  SettingsBlockInset,
  SettingsPanel,
} from "@/components/account/aria-settings-panel-layout";
import { readAriaTheme, subscribeAriaTheme, type AriaThemeMode } from "@/lib/aria-theme";
import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  return subscribeAriaTheme(onChange);
}

export function SettingsModalAppearancePanel() {
  const theme = useSyncExternalStore(subscribe, readAriaTheme, (): AriaThemeMode => "dark");

  return (
    <SettingsPanel>
      <SettingsBlock
        title="Theme"
        description="Choose how ARIA looks in this browser. The setting applies to chat, settings, and workspace pages on every device you use here."
      >
        <SettingsBlockInset>
          <div className="aria-appearance">
            <p className="aria-appearance__label" id="aria-appearance-theme-label">
              Colour scheme
            </p>
            <AriaThemeSwitch value={theme} />
          </div>
        </SettingsBlockInset>
      </SettingsBlock>
    </SettingsPanel>
  );
}
