
import _ from '_';

import {Focused, Capa, ClientSideKeyName, Magics} from 'Common/Enums';
import {leftPanelDisabled, leftPanelType, bMobileDevice} from 'Common/Globals';
import {pString, pInt, decodeURI, windowResizeCallback} from 'Common/Utils';
import {getFolderFromCacheList, getFolderFullNameRaw, getFolderInboxName} from 'Common/Cache';
import {i18n} from 'Common/Translator';

import * as Events from 'Common/Events';
import * as Settings from 'Storage/Settings';

import AppStore from 'Stores/User/App';
import AccountStore from 'Stores/User/Account';
import SettingsStore from 'Stores/User/Settings';
import FolderStore from 'Stores/User/Folder';
import MessageStore from 'Stores/User/Message';

import {AbstractScreen} from 'Knoin/AbstractScreen';
import App from 'App/User';

class MailBoxUserScreen extends AbstractScreen
{
	constructor() {
		super('mailbox', [
			require('View/User/MailBox/SystemDropDown'),
			require('View/User/MailBox/FolderList'),
			require('View/User/MailBox/MessageList'),
			require('View/User/MailBox/MessageView')
		]);
	}

	/**
	 * @returns {void}
	 */
	updateWindowTitle() {
		let foldersInboxUnreadCount = FolderStore.foldersInboxUnreadCount();
		const email = AccountStore.email();

		if (Settings.appSettingsGet('listPermanentFiltered'))
		{
			foldersInboxUnreadCount = 0;
		}

		App.setWindowTitle(('' === email ? '' : '' + (0 < foldersInboxUnreadCount ? '(' + foldersInboxUnreadCount + ') ' : ' ') + email + ' - ') + i18n('TITLES/MAILBOX'));
	}

	/**
	 * @returns {void}
	 */
	onShow() {
		this.updateWindowTitle();

		AppStore.focusedState(Focused.None);
		AppStore.focusedState(Focused.MessageList);

		if (Settings.appSettingsGet('mobile'))
		{
			leftPanelDisabled(true);
		}

		if (!Settings.capa(Capa.Folders))
		{
			leftPanelType(Settings.capa(Capa.Composer) || Settings.capa(Capa.Contacts) ? 'short' : 'none');
		}
		else
		{
			leftPanelType('');
		}
	}

	/**
	 * @param {string} folderHash
	 * @param {number} page
	 * @param {string} search
	 */
	onRoute(folderHash, page, search) {
		let threadUid = folderHash.replace(/^(.+)~([\d]+)$/, '$2');
		const folder = getFolderFromCacheList(getFolderFullNameRaw(folderHash.replace(/~([\d]+)$/, '')));

		if (folder)
		{
			if (folderHash === threadUid)
			{
				threadUid = '';
			}

			FolderStore.currentFolder(folder);

			MessageStore.messageListPage(page);
			MessageStore.messageListSearch(search);
			MessageStore.messageListThreadUid(threadUid);

			App.reloadMessageList();
		}
	}

	/**
	 * @returns {void}
	 */
	onStart() {
		FolderStore.folderList.subscribe(windowResizeCallback);

		MessageStore.messageList.subscribe(windowResizeCallback);
		MessageStore.message.subscribe(windowResizeCallback);

		_.delay(() => {
			SettingsStore.layout.valueHasMutated();
		}, Magics.Time50ms);

		Events.sub('mailbox.inbox-unread-count', (count) => {
			FolderStore.foldersInboxUnreadCount(count);

			const email = AccountStore.email();
			_.each(AccountStore.accounts(), (item) => {
				if (item && email === item.email)
				{
					item.count(count);
				}
			});

			this.updateWindowTitle();
		});
	}

	/**
	 * @returns {void}
	 */
	onBuild() {
		if (!bMobileDevice && !Settings.appSettingsGet('mobile'))
		{
			_.defer(() => {
				App.initHorizontalLayoutResizer(ClientSideKeyName.MessageListSize);
			});
		}
	}

	/**
	 * @returns {Array}
	 */
	routes() {
		var
			inboxFolderName = getFolderInboxName(),
			fNormS = (request, vals) => {
				vals[0] = pString(vals[0]);
				vals[1] = pInt(vals[1]);
				vals[1] = 0 >= vals[1] ? 1 : vals[1];
				vals[2] = pString(vals[2]);

				if ('' === request)
				{
					vals[0] = inboxFolderName;
					vals[1] = 1;
				}

				return [decodeURI(vals[0]), vals[1], decodeURI(vals[2])];
			},
			fNormD = (request, vals) => {
				vals[0] = pString(vals[0]);
				vals[1] = pString(vals[1]);

				if ('' === request)
				{
					vals[0] = inboxFolderName;
				}

				return [decodeURI(vals[0]), 1, decodeURI(vals[1])];
			};

		return [
			[/^([a-zA-Z0-9~]+)\/p([1-9][0-9]*)\/(.+)\/?$/, {'normalize_': fNormS}],
			[/^([a-zA-Z0-9~]+)\/p([1-9][0-9]*)$/, {'normalize_': fNormS}],
			[/^([a-zA-Z0-9~]+)\/(.+)\/?$/, {'normalize_': fNormD}],
			[/^([^\/]*)$/, {'normalize_': fNormS}]
		];
	}
}

export {MailBoxUserScreen, MailBoxUserScreen as default};
