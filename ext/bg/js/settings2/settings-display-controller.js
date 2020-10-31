/*
 * Copyright (C) 2020  Yomichan Authors
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
 * PopupMenu
 * SelectorObserver
 */

class SettingsDisplayController {
    constructor(settingsController, modalController) {
        this._settingsController = settingsController;
        this._modalController = modalController;
        this._contentNode = null;
        this._previewFrameContainer = null;
        this._topLink = null;
        this._menuContainer = null;
        this._openPopupMenus = new Set();
        this._onMoreToggleClickBind = null;
        this._onMenuButtonClickBind = null;
    }

    prepare() {
        this._contentNode = document.querySelector('.content');
        this._previewFrameContainer = document.querySelector('.preview-frame-container');
        this._topLink = document.querySelector('.sidebar-top-link');
        this._menuContainer = document.querySelector('#popup-menus');

        const onFabButtonClick = this._onFabButtonClick.bind(this);
        for (const fabButton of document.querySelectorAll('.fab-button')) {
            fabButton.addEventListener('click', onFabButtonClick, false);
        }

        const onModalAction = this._onModalAction.bind(this);
        for (const node of document.querySelectorAll('[data-modal-action]')) {
            node.addEventListener('click', onModalAction, false);
        }

        const onSelectOnClickElementClick = this._onSelectOnClickElementClick.bind(this);
        for (const node of document.querySelectorAll('[data-select-on-click]')) {
            node.addEventListener('click', onSelectOnClickElementClick, false);
        }

        const onInputTabActionKeyDown = this._onInputTabActionKeyDown.bind(this);
        for (const node of document.querySelectorAll('[data-tab-action]')) {
            node.addEventListener('keydown', onInputTabActionKeyDown, false);
        }

        this._onMoreToggleClickBind = this._onMoreToggleClick.bind(this);
        const moreSelectorObserver = new SelectorObserver({
            selector: '.more-toggle',
            onAdded: this._onMoreSetup.bind(this),
            onRemoved: this._onMoreCleanup.bind(this)
        });
        moreSelectorObserver.observe(document.documentElement, false);

        this._onMenuButtonClickBind = this._onMenuButtonClick.bind(this);
        const menuSelectorObserver = new SelectorObserver({
            selector: '[data-menu]',
            onAdded: this._onMenuSetup.bind(this),
            onRemoved: this._onMenuCleanup.bind(this)
        });
        menuSelectorObserver.observe(document.documentElement, false);

        this._contentNode.addEventListener('scroll', this._onScroll.bind(this), {passive: true});
        this._topLink.addEventListener('click', this._onTopLinkClick.bind(this), false);
        document.querySelector('#show-preview-checkbox').addEventListener('change', this._onShowPreviewCheckboxChange.bind(this), false);

        window.addEventListener('keydown', this._onKeyDown.bind(this), false);
        window.addEventListener('popstate', this._onPopState.bind(this), false);
        this._updateScrollTarget();
    }

    // Private

    _onMoreSetup(element) {
        element.addEventListener('click', this._onMoreToggleClickBind, false);
        return null;
    }

    _onMoreCleanup(element) {
        element.removeEventListener('click', this._onMoreToggleClickBind, false);
    }

    _onMenuSetup(element) {
        element.addEventListener('click', this._onMenuButtonClickBind, false);
        return null;
    }

    _onMenuCleanup(element) {
        element.removeEventListener('click', this._onMenuButtonClickBind, false);
    }

    _onMenuButtonClick(e) {
        const element = e.currentTarget;
        const {menu} = element.dataset;
        this._showMenu(element, menu);
    }

    _onScroll(e) {
        const content = e.currentTarget;
        const topLink = this._topLink;
        const scrollTop = content.scrollTop;
        topLink.hidden = (scrollTop < 100);
    }

    _onFabButtonClick(e) {
        const action = e.currentTarget.dataset.action;
        switch (action) {
            case 'toggle-sidebar':
                document.body.classList.toggle('sidebar-visible');
                break;
            case 'toggle-preview-sidebar':
                document.body.classList.toggle('preview-sidebar-visible');
                break;
        }
    }

    _onShowPreviewCheckboxChange(e) {
        this._previewFrameContainer.classList.toggle('preview-frame-container-visible', e.checked);
    }

    _onMoreToggleClick(e) {
        const container = this._getMoreContainer(e.currentTarget);
        if (container === null) { return; }

        const more = container.querySelector('.more');
        if (more === null) { return; }

        const moreVisible = more.hidden;
        more.hidden = !moreVisible;
        for (const moreToggle of container.querySelectorAll('.more-toggle')) {
            const container2 = this._getMoreContainer(moreToggle);
            if (container2 === null) { continue; }

            const more2 = container2.querySelector('.more');
            if (more2 === null || more2 !== more) { continue; }

            moreToggle.dataset.expanded = `${moreVisible}`;
        }

        e.preventDefault();
        return false;
    }

    _onPopState() {
        this._updateScrollTarget();
    }

    _onKeyDown(e) {
        switch (e.code) {
            case 'Escape':
                if (!this._isElementAnInput(document.activeElement)) {
                    this._closeTopMenuOrModal();
                    e.preventDefault();
                }
                break;
        }
    }

    _onModalAction(e) {
        const node = e.currentTarget;
        const {modalAction} = node.dataset;
        if (typeof modalAction !== 'string') { return; }

        let [action, target] = modalAction.split(',');
        if (typeof target === 'undefined') {
            const currentModal = node.closest('.modal-container');
            if (currentModal === null) { return; }
            target = currentModal.id;
        }

        const modal = this._modalController.getModal(target);
        if (typeof modal === 'undefined') { return; }

        switch (action) {
            case 'show':
                modal.setVisible(true);
                break;
            case 'hide':
                modal.setVisible(false);
                break;
            case 'toggle':
                modal.setVisible(!modal.isVisible());
                break;
        }

        e.preventDefault();
    }

    _onSelectOnClickElementClick(e) {
        if (e.button !== 0) { return; }

        const node = e.currentTarget;
        const range = document.createRange();
        range.selectNode(node);

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        e.preventDefault();
        e.stopPropagation();
        return false;
    }

    _onTopLinkClick(e) {
        if (window.location.hash.length > 0) {
            const {pathname, search} = window.location;
            const url = `${pathname}${search}`;
            history.pushState(null, '', url);
        }

        const content = this._contentNode;
        content.scrollTop = 0;

        e.preventDefault();
        e.stopPropagation();
        return false;
    }

    _onClosePopupMenu({popupMenu, onClose}) {
        this._openPopupMenus.delete(popupMenu);
        popupMenu.off('closed', onClose);
    }

    _onInputTabActionKeyDown(e) {
        if (e.key !== 'Tab' || e.ctrlKey) { return; }

        const node = e.currentTarget;
        const {tabAction} = node.dataset;
        if (typeof tabAction !== 'string') { return; }

        const args = tabAction.split(',');
        switch (args[0]) {
            case 'ignore':
                e.preventDefault();
                break;
            case 'indent':
                e.preventDefault();
                this._indentInput(e, node, args);
                break;
        }
    }

    _updateScrollTarget() {
        const hash = window.location.hash;
        if (!hash.startsWith('#!')) { return; }

        const content = this._contentNode;
        const target = document.getElementById(hash.substring(2));
        if (content === null || target === null) { return; }

        const rect1 = content.getBoundingClientRect();
        const rect2 = target.getBoundingClientRect();
        content.scrollTop += rect2.top - rect1.top;
        this._onScroll({currentTarget: content});
    }

    _getMoreContainer(link) {
        const v = link.dataset.parentDistance;
        const distance = v ? parseInt(v, 10) : 1;
        if (Number.isNaN(distance)) { return null; }

        for (let i = 0; i < distance; ++i) {
            link = link.parentNode;
            if (link === null) { break; }
        }
        return link;
    }

    _closeTopMenuOrModal() {
        for (const popupMenu of this._openPopupMenus) {
            popupMenu.close();
            return;
        }

        const modal = this._modalController.getTopVisibleModal();
        if (modal !== null) {
            modal.setVisible(false);
        }
    }

    _showMenu(element, menuName) {
        const menu = this._settingsController.instantiateTemplate(menuName);
        if (menu === null) { return; }

        this._menuContainer.appendChild(menu);

        const popupMenu = new PopupMenu(element, menu);
        this._openPopupMenus.add(popupMenu);

        const data = {popupMenu, onClose: null};
        data.onClose = this._onClosePopupMenu.bind(this, data);

        popupMenu.on('closed', data.onClose);
        popupMenu.prepare();
    }

    _indentInput(e, node, args) {
        let indent = '\t';
        if (args.length > 1) {
            const count = parseInt(args[1], 10);
            indent = (Number.isFinite(count) && count >= 0 ? ' '.repeat(count) : args[1]);
        }

        const {selectionStart: start, selectionEnd: end, value} = node;
        const lineStart = value.substring(0, start).lastIndexOf('\n') + 1;
        const lineWhitespace = /^[ \t]*/.exec(value.substring(lineStart))[0];

        if (e.shiftKey) {
            const whitespaceLength = Math.max(0, Math.floor((lineWhitespace.length - 1) / 4) * 4);
            const selectionStartNew = lineStart + whitespaceLength;
            const selectionEndNew = lineStart + lineWhitespace.length;
            const removeCount = selectionEndNew - selectionStartNew;
            if (removeCount > 0) {
                node.selectionStart = selectionStartNew;
                node.selectionEnd = selectionEndNew;
                document.execCommand('delete', false);
                node.selectionStart = Math.max(lineStart, start - removeCount);
                node.selectionEnd = Math.max(lineStart, end - removeCount);
            }
        } else {
            if (indent.length > 0) {
                const indentLength = (Math.ceil((start - lineStart + 1) / indent.length) * indent.length - (start - lineStart));
                document.execCommand('insertText', false, indent.substring(0, indentLength));
            }
        }
    }

    _isElementAnInput(element) {
        const type = element !== null ? element.nodeName.toUpperCase() : null;
        switch (type) {
            case 'INPUT':
            case 'TEXTAREA':
            case 'SELECT':
                return true;
            default:
                return false;
        }
    }
}
