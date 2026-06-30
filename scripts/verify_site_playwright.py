from __future__ import annotations

import json
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
SCREENSHOT_DIR = ROOT / "screenshots"
URL = "http://127.0.0.1:8765/index.html"
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")


def main() -> None:
    SCREENSHOT_DIR.mkdir(exist_ok=True)

    results: dict[str, object] = {
        "url": URL,
        "browser": str(CHROME),
        "screenshots": [],
        "checks": {},
    }

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=str(CHROME),
            headless=False,
            args=["--disable-gpu", "--no-first-run"],
        )
        page = browser.new_page(viewport={"width": 1440, "height": 1200})

        try:
            primary_nav_names = ["Beranda", "Klasemen", "Bracket"]
            secondary_nav_names = ["Peserta", "Undian", "Pertandingan", "Tentang"]

            for width in (375, 768, 1024, 1440):
                page.set_viewport_size({"width": width, "height": 1200})
                page.goto(URL, wait_until="networkidle")
                expect(page.get_by_role("heading", name="Klasemen")).to_be_visible()
                expect(page.locator(".brand img")).to_have_attribute("src", "assets/logo-cropped.png")
                expect(page.locator('link[rel="icon"]')).to_have_attribute("href", "assets/logo-cropped.png")
                if not page.locator(".brand img").evaluate("image => image.complete && image.naturalWidth > 0"):
                    raise AssertionError("Brand logo did not load.")
                expect(page.locator("#dataMode")).to_contain_text("Google Sheet panitia")
                expect(page.locator("#dataMode")).to_contain_text("data pertandingan lokal hanya sebagai referensi")
                expect(page.locator("#groupFilter")).to_contain_text("Grup A")
                expect(page.locator("#leaderboardBody tr").first).to_be_visible()
                expect(page.locator("#primaryNav .nav-button[data-nav]")).to_have_count(3)
                expect(page.locator("#primaryNav .nav-button[data-nav]")).to_contain_text(primary_nav_names)
                expect(page.locator("#menuToggle")).to_be_visible()
                expect(page.locator("#secondaryNav")).not_to_be_visible()
                page.locator("#menuToggle").click()
                expect(page.locator("#secondaryNav")).to_be_visible()
                expect(page.locator("#menuToggle")).to_have_attribute("aria-expanded", "true")
                expect(page.locator("#secondaryNav .nav-button[data-nav]")).to_have_count(4)
                expect(page.locator("#secondaryNav .nav-button[data-nav]")).to_contain_text(secondary_nav_names)
                page.keyboard.press("Escape")
                expect(page.locator("#secondaryNav")).not_to_be_visible()
                expect(page.locator("#menuToggle")).to_have_attribute("aria-expanded", "false")

                search_input = page.locator("#searchInput")
                search_box = page.locator(".field-search .search-input")
                search_height = search_box.bounding_box()["height"]
                if search_height < 48:
                    raise AssertionError(f"Search box height is too small: {search_height}px")
                search_input_sample = color_sample(search_input)
                if search_input_sample["background"] != "rgba(0, 0, 0, 0)":
                    raise AssertionError(f"Search input should be transparent, got {search_input_sample['background']}")
                if search_input_sample["color"] == search_input_sample["background"]:
                    raise AssertionError("Search input text color should not match the background.")
                page.locator("#searchInput").fill("Bowo")
                expect(page.locator("#leaderboardBody").get_by_text("Bowo", exact=True)).to_be_visible()
                page.locator("#searchInput").fill("")

                page.locator("#primaryNav button[data-nav=\"bracket\"]").click()
                expect(page.locator("#bracketView")).to_be_visible()
                bracket_box = page.locator("#bracketView").bounding_box()
                if bracket_box["width"] < width * 0.94:
                    raise AssertionError(f"Bracket section should span the viewport, got {bracket_box['width']}px at {width}px wide.")
                expect(page.locator("#bracketView .bracket-round-header")).to_contain_text(["32 Besar", "16 Besar", "8 Besar", "4 Besar", "Final"])
                expect(page.locator("#bracketView .google-match-card").first).to_be_visible()
                bracket_scroll = page.locator("#googleBracketScroll")
                scroll_metrics = bracket_scroll.evaluate("el => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrollLeft: el.scrollLeft, overflowX: getComputedStyle(el).overflowX })")
                max_scroll = scroll_metrics["scrollWidth"] - scroll_metrics["clientWidth"]
                if scroll_metrics["overflowX"] not in ("auto", "scroll"):
                    raise AssertionError(f"Bracket scroller should be horizontally scrollable when needed, got {scroll_metrics['overflowX']}")
                if width >= 1024:
                    left_btn = page.locator(".bracket-scroll-btn.left")
                    right_btn = page.locator(".bracket-scroll-btn.right")
                    expect(left_btn).to_be_visible()
                    expect(right_btn).to_be_visible()
                    if max_scroll > 2:
                        before = bracket_scroll.evaluate("el => el.scrollLeft")
                        right_btn.click()
                        page.wait_for_timeout(200)
                        after = bracket_scroll.evaluate("el => el.scrollLeft")
                        if after <= before:
                            raise AssertionError("Bracket right scroll button did not move the scroller.")
                        right_btn.click()
                        page.wait_for_timeout(100)
                        if bracket_scroll.evaluate("el => el.scrollLeft") < after:
                            pass
                    elif not right_btn.is_disabled():
                        raise AssertionError("Bracket right scroll button should be disabled when the full desktop bracket fits.")
                else:
                    if max_scroll <= 2:
                        raise AssertionError("Mobile bracket scroller should overflow horizontally.")
                    page.locator("#googleBracketScroll").evaluate("el => { el.style.scrollBehavior = 'auto'; el.scrollLeft = Math.min(400, el.scrollWidth - el.clientWidth); }")
                    page.wait_for_timeout(250)
                    if bracket_scroll.evaluate("el => el.scrollLeft") == 0:
                        raise AssertionError("Mobile bracket scroller did not move horizontally.")
                if page.evaluate("() => document.documentElement.scrollWidth > window.innerWidth + 4"):
                    raise AssertionError("Document should not overflow horizontally outside the bracket scroller.")

                screenshot = SCREENSHOT_DIR / f"playwright-{width}.png"
                page.screenshot(path=str(screenshot), full_page=True)
                results["screenshots"].append(str(screenshot))

            page.locator("#menuToggle").click()
            page.locator("#secondaryNav button[data-nav=\"participants\"]").click()
            expect(page.locator("#participantsView")).to_be_visible()
            dark_samples = sample_theme(page)

            page.locator(".participant-card").filter(has_text="Bowo").get_by_role("button", name="Lihat Prediksi").click()
            expect(page.locator("#participantDetail")).to_be_visible()
            correct_card = page.locator(".prediction-item.outcome-correct").first
            wrong_card = page.locator(".prediction-item.outcome-wrong").first
            expect(correct_card).to_be_visible()
            expect(wrong_card).to_be_visible()
            dark_prediction_samples = {
                "correct": color_sample(correct_card),
                "wrong": color_sample(wrong_card),
            }

            page.locator("#menuToggle").click()
            page.locator("#secondaryNav button[data-nav=\"draw\"]").click()
            expect(page.locator("#drawView")).to_be_visible()
            expect(page.locator("#drawExportCsvButton")).to_be_visible()
            with page.expect_download() as download_info:
                page.locator("#drawExportCsvButton").click()
            download = download_info.value
            if not download.suggested_filename.endswith(".csv"):
                raise AssertionError(f"Expected CSV export, got {download.suggested_filename}")

            page.locator("#menuToggle").click()
            page.locator("#secondaryNav button[data-nav=\"matches\"]").click()
            expect(page.locator("#matchesView")).to_be_visible()
            final_match_chip = page.locator("#matchesView .match-card .status-chip.final").first
            expect(final_match_chip).to_be_visible()
            final_match_sample = color_sample(final_match_chip)
            if "33, 208, 122" not in final_match_sample["background"] and "22, 185, 108" not in final_match_sample["background"]:
                raise AssertionError(f"Final match chip should be green, got {final_match_sample['background']}")
            page.locator("#themeToggle").click()
            expect(page.locator("body")).to_have_attribute("data-theme", "light")
            light_samples = sample_theme(page)

            if dark_samples["participant_card"]["background"] == light_samples["participant_card"]["background"]:
                raise AssertionError("Participant cards should have visibly different dark and light backgrounds.")
            if dark_samples["table"]["background"] == light_samples["table"]["background"]:
                raise AssertionError("Tables should have visibly different dark and light backgrounds.")
            if dark_prediction_samples["correct"]["background"] == dark_prediction_samples["wrong"]["background"]:
                raise AssertionError("Correct and wrong prediction cards should not share the same background.")
            if dark_prediction_samples["correct"]["border"] == dark_prediction_samples["wrong"]["border"]:
                raise AssertionError("Correct and wrong prediction cards should not share the same border color.")

            results["checks"] = {
                "data_status_visible": True,
                "cropped_logo_loaded": True,
                "group_filter_loaded": True,
                "leaderboard_rows_visible": True,
                "participant_name_visible": True,
                "primary_nav_split": True,
                "secondary_menu_navigation": True,
                "responsive_bracket_layout": True,
                "mobile_bracket_scroll": True,
                "search_input_layout": True,
                "draw_export_csv": True,
                "final_match_chip_green": True,
                "theme_toggle": True,
                "dark_light_card_difference": True,
                "dark_light_table_difference": True,
                "prediction_correct_wrong_colors": True,
            }
            results["theme_samples"] = {
                "dark": dark_samples,
                "light": light_samples,
                "dark_predictions": dark_prediction_samples,
                "final_match_chip": final_match_sample,
            }

        finally:
            browser.close()

    print(json.dumps(results, indent=2))


def color_sample(locator) -> dict[str, str]:
    return locator.evaluate(
        """element => {
            const style = window.getComputedStyle(element);
            return {
                background: style.backgroundColor,
                border: style.borderColor,
                color: style.color
            };
        }"""
    )


def sample_theme(page) -> dict[str, dict[str, str]]:
    return {
        "participant_card": color_sample(page.locator(".participant-card").first),
        "table": color_sample(page.locator(".table-wrap").first),
        "metric": color_sample(page.locator(".metric").first),
    }


if __name__ == "__main__":
    main()
