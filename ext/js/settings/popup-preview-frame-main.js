/*
 * Copyright (C) 2019-2021  Yomichan Authors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/* global
 * HotkeyHandler
 * PopupFactory
 * PopupPreviewFrame
 * api
 */

(async () => {
    try {
        api.prepare();

        const {tabId, frameId} = await api.frameInformationGet();

        const hotkeyHandler = new HotkeyHandler();
        hotkeyHandler.prepare();

        const popupFactory = new PopupFactory(frameId);
        popupFactory.prepare();

        const preview = new PopupPreviewFrame(tabId, frameId, popupFactory, hotkeyHandler);
        await preview.prepare();

        document.documentElement.dataset.loaded = 'true';
    } catch (e) {
        yomichan.logError(e);
    }
})();
