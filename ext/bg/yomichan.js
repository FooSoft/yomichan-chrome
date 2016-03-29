/*
 * Copyright (C) 2016  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


class Yomichan {
    constructor() {
        this.res = {
            rules:    'bg/data/rules.json',
            edict:    'bg/data/edict.json',
            enamdict: 'bg/data/enamdict.json',
            kanjidic: 'bg/data/kanjidic.json'
        };

        this.translator = new Translator();
        this.updateState('disabled');

        chrome.runtime.onMessage.addListener(this.onMessage.bind(this));
        chrome.browserAction.onClicked.addListener(this.onBrowserAction.bind(this));

        Handlebars.partials = Handlebars.templates;
    }

    onMessage(request, sender, callback) {
        const {action, data} = request;
        const handler = {
            findKanji:      ({text}) => this.translator.onFindKanji(text),
            findTerm:       ({text}) => this.translator.findTerm(text),
            getState:       () => this.state,
            renderTemplate: ({data, template}) => Handlebars.templates[template](data)
        }[action];

        if (handler !== null) {
            const result = handler.call(this, data);
            if (callback !== null) {
                callback(result);
            }
        }
    }

    onBrowserAction(tab) {
        switch (this.state) {
            case 'disabled':
                this.updateState('loading');
                break;
            case 'enabled':
                this.updateState('disabled');
                break;
        }
    }

    updateState(state) {
        this.state = state;

        switch (state) {
            case 'disabled':
                chrome.browserAction.setBadgeText({text: ''});
                break;
            case 'enabled':
                chrome.browserAction.setBadgeText({text: 'on'});
                break;
            case 'loading':
                chrome.browserAction.setBadgeText({text: '...'});
                this.translator.loadData(this.res, () => this.updateState('enabled'));
                break;
        }

        chrome.tabs.query({}, (tabs) => {
            for (const tab of tabs) {
                chrome.tabs.sendMessage(tab.id, this.state, () => null);
            }
        });
    }
}

window.yomichan = new Yomichan();
