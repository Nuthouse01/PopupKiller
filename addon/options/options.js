
/*
script that will run behind the options page
options include:
	temporary disable without uninstall
	set a homepage pattern
	set a newtab pattern
	toggle the icon?
	button to add list of suggested websites
	button to clear the whole list (except for settings stuff)
*/


// initialize: connect actions to all the HTML elements

// basically a copy of all the info in storage
var globalstorage = [];
// are we currently enabled or disabled?
var PKenable = 1; // 1=enable
var PKhomepage = ""; // firefox = about:home, chrome = ? chrome://newtab/ ?
var PKnewtab = "";   // firefox = about:newtab, chrome = chrome://newtab/
var defaults = ["adexchangecloud.com","cdnondemand.org","deloton.com","hicpm5.com",
"primosearch.com","nextlnk?.com","serve.popads.net"];

// store the HTML elements into variables:
var disablebox = 	document.querySelector('#enabledisable');
var hptext = 		document.querySelector('#homepage');
var nttext = 		document.querySelector('#newtab');

var savebutton = 	document.querySelector('#save');
var loadbutton = 	document.querySelector('#loaddefault');
var clearbutton = 	document.querySelector('#clearall');


// attach functions to buttons:
// applySettings()
savebutton.addEventListener('click', applySettings);
// addDefaultPatterns()
loadbutton.addEventListener('click', addDefaultPatterns);
// clearPatternList()
// TODO: instead make it create a popup for confirmation?
clearbutton.addEventListener('click', clearPatternList);


console.log("PopupKiller options: launch!");
readStorage();




function readStorage() {
	var gettingItem = browser.storage.local.get(); // get everything
	gettingItem.then(populate, onError);
}
function populate(result) {
	globalstorage = Object.entries(result);
	//console.log(result);
	
	extractSettings();
	
	// now globalstorage contains only valid patterns, settings stored in variables
	// fill the settings into the form
	if(PKenable==0) {disablebox.setAttribute('checked','');}
	hptext.value = PKhomepage;
	nttext.value = PKnewtab;
}



// function to capture/apply enable/disable, homepage, newtab, possibly icon toggle
function applySettings() {
	console.log("PopupKiller options: settings saved!");
	// capture enable/disable,
	if(disablebox.checked) {PKenable = 0;} else {PKenable = 1;}
	var setenable = browser.storage.local.set( { PKen : PKenable } );
	setenable.then('', onError);
	// capture homepage
	PKhomepage = hptext.value;
	var sethp = browser.storage.local.set( { PKhp : PKhomepage } );
	sethp.then('', onError);
	
	// capture newtab
	PKnewtab = nttext.value;
	var setnt = browser.storage.local.set( { PKnt : PKnewtab } );
	setnt.then('', onError);
	
	notifyBG();
}


// just going to use the same function in all 3 scripts to extract the settings
// modified as needed for each but keep the same essential structure
// upside: simpler to read, better functionalization
// downside: slightly less efficient at runtime
function extractSettings() {
	let i = 0;
	while(i < globalstorage.length) {
		let f = globalstorage[i];
		// this is where to remove settings entries from the list!!!!
		if(f[0] == "PKen") { // enable
			PKenable = f[1];
			globalstorage.splice(i,1); continue;
		}
		if(f[0] == "PKhp") { // homepage
			PKhomepage = f[1];
			globalstorage.splice(i,1); continue;
		}
		if(f[0] == "PKnt") { // newtab
			PKnewtab = f[1];
			globalstorage.splice(i,1); continue;
		}
		if(f[0] == "PKv") { // version check
			// this space reserved for version-update changes to storage data
			globalstorage.splice(i,1); continue;
		}
		i++; // only increment i if its a pattern, not a setting
	}
}




function addDefaultPatterns() {
	//console.log("add default");
	let globalstoragecopy = globalstorage;
	let z = 0;
	for(let newdef of defaults) {
		let exist = false;
		for (let entry of globalstoragecopy) {
			if(newdef == entry[0]) {exist = true;}
		}
		if(!exist) {
			addStorage(newdef);
			globalstorage.push([newdef,0]);
			z++;
		}
	}
	notifyBG();
	let loadresponse = document.querySelector('#loadresponse');
	let t = z.toString() + " patterns added";
	loadresponse.textContent = t;
}
function addStorage(urltoadd) {
	var setting = browser.storage.local.set( { [urltoadd] : 0 } );
	setting.then(() => {
		console.log("PopupKiller options: added " + urltoadd + " to klist");
	}, onError);
}



function clearPatternList() {
	let z = 0;
	for(let i = (globalstorage.length - 1); i >= 0; i--) {
		removeStorage(globalstorage[i][0]);
		globalstorage.splice(i,1);
		z++;
	}
	notifyBG();
	let clearresponse = document.querySelector('#clearresponse');
	let t = z.toString() + " patterns cleared";
	clearresponse.textContent = t;
}
function removeStorage(urltoremove) {
	var removingItem = browser.storage.local.remove(urltoremove);
	removingItem.then(() => {
		console.log("PopupKiller options: removed " + urltoremove + " from klist");
	}, onError);
}



function notifyBG() {
	var sending = browser.runtime.sendMessage({  PUKupd: "confirm"  });
	sending.then(() => {
		console.log("PopupKiller options: message: update klist");
	}, onError);  
}

function onError(error) {
	console.error("PopupKiller options error: " + Object.entries(error));
}


