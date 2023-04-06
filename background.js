// if no sorting criteria exists, det default to 'newest'
const sorting = chrome.storage.local.get(["sortBy"]).then(async (res) => {
	if (!res.sortBy) await chrome.storage.local.set({ sortBy: "newest" })
})

// if no theme preference exists, set default to 'light'
const theme = chrome.storage.local.get(["theme"]).then(async (res) => {
	if (!res.theme) await chrome.storage.local.set({ theme: "light" })
})


chrome.storage.onChanged.addListener(() => {
	chrome.storage.local.get(["soundmarks"]).then(async () => {
		await chrome.runtime.sendMessage({
			message: "refreshSoundmarks",
			target: "popup.js"
		})
	})
})

chrome.runtime.onMessage.addListener(async (request) => {
	if (request.message === "playSoundmark") {
		const trackLink = request.trackLink
		const timeStamp = request.timeStamp

		// find currently playing soundcloud tab
		let [soundcloudTab] = await chrome.tabs.query({
			url: "https://*.soundcloud.com/*",
			audible: true,
		})

		// if no soundcloud tab is playing, find soundcloud tab in this current window
		if (!soundcloudTab) {
			[soundcloudTab] = await chrome.tabs.query({
				url: "https://*.soundcloud.com/*",
				lastFocusedWindow: true
			})
		}

		// if no soundcloud tab in last focused window has been found, find any active soundcloud tab
		if (!soundcloudTab) {
			[soundcloudTab] = await chrome.tabs.query({
				url: "https://*.soundcloud.com/*",
			})
		}

		if (soundcloudTab) {
			const tabWindow = soundcloudTab.windowId
			await chrome.windows.update(tabWindow, { focused: true })

			const soundcloudTabId = soundcloudTab.id
			if (soundcloudTab.url.includes(trackLink)) {
				// can not reload a tab if the url is identical, so recreate tab.
				await chrome.tabs.create({
					url: `${trackLink}#t=${timeStamp}`,
					windowId: tabWindow
				})
				await chrome.tabs.remove(soundcloudTabId)
			}
			else {
				await chrome.tabs.update(soundcloudTabId, { url: `${trackLink}#t=${timeStamp}` })
			}
		}
		else {
			// if no soundcloud tab has been found, open a new tab and navigate to soundcloud.com
			console.log("did not find soundcloud tab.")
			soundcloudTab = await chrome.tabs.create({ url: `${trackLink}#t=${timeStamp}` })
		}
	}

	if (request.message === "deleteSoundmark") {
		chrome.storage.local.get(["soundmarks"]).then(res => {
			let soundmarks = res.soundmarks
			soundmarks = soundmarks.filter(x => x.id !== request.id)
			chrome.storage.local.set({ soundmarks }).then(async () => {
				await chrome.runtime.sendMessage({
					message: "refreshSoundmarks",
					target: "popup.js"
				})
			})
		})
	}
})