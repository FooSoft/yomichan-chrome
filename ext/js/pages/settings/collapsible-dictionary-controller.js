/*
 * Copyright (C) 2021  Yomichan Authors
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
 * ObjectPropertyAccessor
 */

class CollapsibleDictionaryController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._getDictionaryInfoToken = null;
        this._dictionaryInfoMap = new Map();
        this._container = null;
        this._selects = [];
        this._allSelect = null;
        this._eventListeners = new EventListenerCollection();
    }

    async prepare() {
        this._container = document.querySelector('#collapsible-dictionary-list');

        await this._onDatabaseUpdated();
        await this._updateOptions();

        yomichan.on('databaseUpdated', this._onDatabaseUpdated.bind(this));
        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));
    }

    // Private

    async _onDatabaseUpdated() {
        const token = {};
        this._getDictionaryInfoToken = token;
        const dictionaries = await this._settingsController.getDictionaryInfo();
        if (this._getDictionaryInfoToken !== token) { return; }
        this._getDictionaryInfoToken = null;

        this._dictionaryInfoMap.clear();
        for (const entry of dictionaries) {
            this._dictionaryInfoMap.set(entry.title, entry);
        }

        await this._updateOptions();
    }

    _onOptionsChanged({options}) {
        this._eventListeners.removeAllEventListeners();
        this._selects = [];

        const {dictionaries} = options;

        const fragment = document.createDocumentFragment();

        this._setupAllSelect(fragment, options);

        for (const dictionary of Object.keys(dictionaries)) {
            const dictionaryInfo = this._dictionaryInfoMap.get(dictionary);
            if (typeof dictionaryInfo === 'undefined') { continue; }

            const select = this._addSelect(fragment, dictionary, `rev.${dictionaryInfo.revision}`);
            select.dataset.setting = ObjectPropertyAccessor.getPathString(['dictionaries', dictionary, 'definitionsCollapsible']);
            this._eventListeners.addEventListener(select, 'settingChanged', this._onDefinitionsCollapsibleChange.bind(this), false);

            this._selects.push(select);
        }

        this._container.textContent = '';
        this._container.appendChild(fragment);
    }

    _onDefinitionsCollapsibleChange() {
        this._updateAllSelectFresh();
    }

    _onAllSelectChange(e) {
        const {value} = e.currentTarget;
        if (value === 'varies') { return; }
        this._setDefinitionsCollapsibleAll(value);
    }

    _setupAllSelect(fragment, options) {
        const select = this._addSelect(fragment, 'All', '');

        const option = document.createElement('option');
        option.value = 'varies';
        option.textContent = 'Varies';
        option.disabled = true;
        select.appendChild(option);

        this._eventListeners.addEventListener(select, 'change', this._onAllSelectChange.bind(this), false);

        this._allSelect = select;
        this._updateAllSelect(options);
    }

    _addSelect(fragment, dictionary, version) {
        const node = this._settingsController.instantiateTemplate('collapsible-dictionary-item');
        fragment.appendChild(node);

        const nameNode = node.querySelector('.dictionary-title');
        nameNode.textContent = dictionary;

        const versionNode = node.querySelector('.dictionary-version');
        versionNode.textContent = version;

        return node.querySelector('.definitions-collapsible');
    }

    async _updateOptions() {
        const options = await this._settingsController.getOptions();
        this._onOptionsChanged({options});
    }

    async _updateAllSelectFresh() {
        this._updateAllSelect(await this._settingsController.getOptions());
    }

    _updateAllSelect(options) {
        let value = null;
        let varies = false;
        for (const {definitionsCollapsible} of Object.values(options.dictionaries)) {
            if (value === null) {
                value = definitionsCollapsible;
            } else if (value !== definitionsCollapsible) {
                varies = true;
                break;
            }
        }

        this._allSelect.value = (varies || value === null ? 'varies' : value);
    }

    async _setDefinitionsCollapsibleAll(value) {
        const options = await this._settingsController.getOptions();
        const targets = [];
        for (const dictionary of Object.keys(options.dictionaries)) {
            const path = ObjectPropertyAccessor.getPathString(['dictionaries', dictionary, 'definitionsCollapsible']);
            targets.push({action: 'set', path, value});
        }
        await this._settingsController.modifyProfileSettings(targets);
        for (const select of this._selects) {
            select.value = value;
        }
    }
}