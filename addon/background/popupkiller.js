/* Brian Henson 1/24/2018 */

// basically a copy of all the info in storage
var globalstorage = [];
var globalregex = [];

var PKenable = 1;
var PKhomepage = "";
var PKnewtab = "";
var PKcurrentver = 1.2;

function onError(error) {
	console.error("PopupKiller BG error: " + Object.entries(error));
}

function regexify(k) {
	/* transforms pseudo-regex into actual regex */
	//k = "^" + k + "$";          // 1: put ^ at start and $ at end
	k = k.replace(/\./g, "\\.");// 2: replace . with \. (all dots are literal)
	k = k.replace(/\*/g, ".*");	// 3: replace * with .* (all stars are any-length wildcard)
	k = k.replace(/\?/g, ".");  // 4: replace ? with . (all questions are length-1 wildcard)
	return k;
}

/*
function removeStorage(urltoremove) {
	var removingItem = browser.storage.local.remove(urltoremove);
	removingItem.then(() => {
		console.log("PopupKiller: removed " + urltoremove + " from klist");
		readStorage();
	}, onError);
}
function addStorage(urltoadd) {
	var setting = browser.storage.local.set( { [urltoadd] : 0 } );
	setting.then(() => {
		console.log("PopupKiller: added " + urltoadd + " to klist");
		readStorage();
	}, onError);
}
function clearStorage() {
	var clearKlist = browser.storage.local.clear();
	clearKlist.then(() => {
		console.log("PopupKiller: wiped out entire klist");
		readStorage();
	}, onError);
}
*/


function addHit(urltoinc, num) {
 	var increment = browser.storage.local.set( { [urltoinc] : num } );
	increment.then(() => {
		console.log("PopupKiller BG: incremented hits for " + urltoinc + ", now at " + num);
	}, onError);
	// if I want to keep track of the most recently killed site, this is where
	// the code would be added!
}

function readStorage() {
	var gettingItem = browser.storage.local.get(); // get everything
	gettingItem.then(copyKlist, onError);
}
function copyKlist(result) {
	// creates a list of pattern:hits pairs, list of lists
	globalstorage = Object.entries(result);
	
	let versionexists = extractSettings();
	
	globalregex = []; // wipe it
	for(let patternpair of globalstorage) {
		// NOTE: if I want the user to input real RegEx instead of pseudo-regex, change here!
		// NOTE: the order of 'globalstorage' doesnt matter, but it MUST match the order of 'globalregex'
		globalregex.push(regexify(patternpair[0])); // fill it
	}
	
	if(!versionexists) {
		// either first-time install, or updating from 1.0/1.1 ---> 1.2
			// update 1.0/1.1 ----> 1.2: remove leading/trailing *
		// at this point only valid patterns are remaining in 'globalstorage'...
		
		// this for-loop is only for the v1.2 update
		for(let i = 0; i < globalstorage.length; i++) {
			let pair = globalstorage[i];
			let old = pair[0];
			let pattern = old.replace(/(^\*)|(\*$)/g,"");
			if(old == pattern) {continue;}
			//console.log("replacing " + old + " with " + pattern);
			
			// add the new
			var setting = browser.storage.local.set( { [pattern] : pair[1] } );
			setting.then(() => {
				console.log("PopupKiller: added " + pattern + " to klist");
			}, onError);
			// remove the old
			var removingItem = browser.storage.local.remove(old);
			removingItem.then(() => {
				console.log("PopupKiller: removed " + old + " from klist");
			}, onError);
		}
		
		// this block stays, however
		var vers = browser.storage.local.set( { "PKv" : PKcurrentver } );
		vers.then(() => {
			console.log("PopupKiller BG: version tag was missing, now added");
			readStorage();
		}, onError);
	}
	
	console.log("PopupKiller BG: dump of patterns in storage,");
	console.log(globalstorage);
}



// just going to use the same function in all 3 scripts to extract the settings
// modified as needed for each but keep the same essential structure
// also returns true if version info exists, false otherwise
// upside: simpler to read, better functionalization
// downside: slightly less efficient at runtime
function extractSettings() {
	let i = 0; let versionexists = false;
	while(i < globalstorage.length) {
		let f = globalstorage[i];
		
		// this is where to remove settings entries from the list!!!!
		if(f[0] == "PKen") { // enable
			PKenable = f[1];
			globalstorage.splice(i,1); continue;
		}
		if(f[0] == "PKhp") { // homepage
			PKhomepage = regexify(f[1]);
			globalstorage.splice(i,1); continue;
		}
		if(f[0] == "PKnt") { // newtab
			PKnewtab = regexify(f[1]);
			globalstorage.splice(i,1); continue;
		}
		if(f[0] == "PKv") { // version check
			versionexists = true;
			// this space reserved for version-update changes to storage data
			globalstorage.splice(i,1); continue;
		}
		
		i++; // only increment i if its a pattern, not a setting
	}
	return versionexists;
}



function compareAndKill(tabid, taburl) {
	if((PKnewtab != '') && (taburl.match(PKnewtab))) {
		console.log("PopupKiller BG: newtab detected, matched pattern '" + PKnewtab + "' within url " + taburl);
		return;
	}
	if((PKhomepage != '') && (taburl.match(PKhomepage))) {
		console.log("PopupKiller BG: homepage detected, matched pattern '" + PKhomepage + "' within url " + taburl);
		return;
	}
	// never kill any firefox or chrome internal-use pages
	// never kill firefox addon store
	// never kill chrome addon store
	if(taburl.match(/^about:/) || taburl.match(/^chrome:/) 
		|| taburl.match(/((addons)|(support))\.mozilla\.org/) 
		|| taburl.match(/chrome\.google\.com/)) { return; }
	// probably should add more 'never-kill' patterns... later
	
	//console.log("testing...");
	for(let i = 0; i < globalregex.length; i++) {
		//console.log(globalregex[i]);
		let v = taburl.match(globalregex[i]);
		if(v != null) {
			let removing = browser.tabs.remove(tabid);
			removing.then(() => {
				console.log("PopupKiller BG: page killed, matched pattern '" + globalstorage[i][0] + "' to substring '" + v + "' within url " + taburl);
				globalstorage[i][1] += 1;
				addHit(globalstorage[i][0], globalstorage[i][1]);
			}, onError);
			break;
		}
	}
}

/*
function handleWindowCreated(win) { // inactive
	console.log("WindowCreated! WindowID=" + win.id + ", Type=" + win.type + ", TabList=" + win.tabs);
}
function handleTabCreated(tab) { // inactive
	console.log("TabCreated! TabID=" + tab.id + ", URL=" + tab.url + ", WindowID=" + tab.windowId);
}
*/

function handleTabUpdated(tabId, changeInfo, tab) {
	if (changeInfo.url) {
		console.log("PopupKiller BG: TabUpdated! TabID=" + tabId + ", WindowID=" + tab.windowId + ", URL=" + changeInfo.url );
		
		// definitely needed here
		if(PKenable==1) { compareAndKill(tab.id, tab.url); }
	}
}

function handleMessage(message) {
	console.log("PopupKiller BG: message received, " + Object.entries(message));
	if(message.PUKupd) {
		if(message.PUKupd == "confirm") {
			readStorage();
		}
	}
	// otherwise it's not a message meant for me, probably
}



/*
// i am able to auto-detect chrome vs firefox...
// ...but unable to find a way to get homepag/newtab that doesn't crash in Chrome
// note: the 'browserSettings' tag in Permissions in manifest.json prevents it from loading in chrome
let ss = window.navigator.userAgent;
//console.log(ss);
if(ss.match(/chrome/i) == null) {
	// if the string contains chrome, this code cannot be run! so dont!
	browser.browserSettings.newTabPageOverride.get({}).then(result => {
		console.log("PopupKiller: detected new-tab page '" + result.value + "'");
		avoidNewtab = result.value;
	});
	browser.browserSettings.homepageOverride.get({}).then(result => {
		console.log("PopupKiller: detected home page '" + result.value + "'");
		avoidHomepage = result.value;
	});
}
*/

//browser.windows.onCreated.addListener(handleWindowCreated);
//browser.tabs.onCreated.addListener(handleTabCreated);
browser.tabs.onUpdated.addListener(handleTabUpdated);
browser.runtime.onMessage.addListener(handleMessage);

//var vers = browser.storage.local.remove("PKv");
//vers.then(readStorage, onError);
readStorage();
console.log("PopupKiller BG: init BG script"); 



// testing code:
/*
clearStorage();
addStorage("*primosearch.com*");
addStorage("*www.nextlnk1.com*");
addStorage("*serve.popads.net*");
addStorage("*www.adexchangecloud.com*");
addStorage("*www.hicpm5.com*");
addStorage("*cdnondemand.org*");

addStorage("KILLME");
addStorage("*KILLAME*");
*/

