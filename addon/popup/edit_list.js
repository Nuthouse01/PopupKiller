/* Brian Henson 1/24/2018 */

/* 
initialize
 */
// set up variables connected to the existing parts of the balloon
console.log("PopupKiller balloon: launch!");

var patternContainer = document.querySelector('.pattern-container');
var inputPattern = document.querySelector('.new-pattern input');
var addBtn = document.querySelector('.add');
// basically a copy of all the info in storage
var globalstorage = [];
// are we currently enabled or disabled?
var PKenable = 1;
// how small is too small for a pattern?
var patterntoosmall = 7;
// attach listeners to existing parts of balloon
addBtn.addEventListener('click', addNewPattern);
// fill out the balloon with existing entries
readStorage();



// readStorage() -> populate()
// fills out the balloon with all existing entries
function readStorage() {
	var gettingItem = browser.storage.local.get(); // get everything
	gettingItem.then(populate, onError);
}
function populate(result) {
	// creates a list of pattern:hits pairs, list of lists
	globalstorage = Object.entries(result);
	
	extractSettings();
	
	if(PKenable == 1) {
		// sort it by number of hits
		globalstorage.sort(mySort);
		// call insertDiv() for each entry
		for(i = 0; i < globalstorage.length; i++) {
			insertDiv(globalstorage[i], i);
		}
	} else {
		myWarning("--currently disabled--");
		inputPattern.setAttribute('disabled','');
		addBtn.setAttribute('disabled','');
	}
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
			//PKhomepage = regexify(f[1]);
			globalstorage.splice(i,1); continue;
		}
		if(f[0] == "PKnt") { // newtab
			//PKnewtab = regexify(f[1]);
			globalstorage.splice(i,1); continue;
		}
		if(f[0] == "PKv") { // version check
			// this space reserved for version-update changes to storage data
			globalstorage.splice(i,1); continue;
		}
		i++; // only increment i if its a pattern, not a setting
	}
}




// addNewPattern:
function addNewPattern() {
	// save the text and clear the text box, whether it's valid or not
	var newPattern = inputPattern.value;
	inputPattern.value = '';
	
	// clean/validate the input; returns empty string if bad
	var cleanPattern = validateInput(newPattern);
	if(cleanPattern == '') { return; }
	
	// build a pattern:hits pair, insert into list, sort, find its new index
	var newpair = [ cleanPattern, 0 ];
	globalstorage.push(newpair);
	globalstorage.sort(mySort);
	var pos = globalstorage.indexOf(newpair);
	
	// build the table entry
	insertDiv(newpair, pos);	
	
	// send message to BG script
	addStorage(cleanPattern);
}


// NOTE: is argument the position # or the node at that position? how to get one from the other?
function insertDiv(newpair, pos) {
	// should be modular, so a URL can be inserted in the middle of the list
	// Node.insertBefore()
	var patternTable = document.querySelector('.pattern-table');
	
	var urlText = document.createElement('td');
	    urlText.setAttribute('class','pattern-text');
	    urlText.textContent = newpair[0];
	var numHits = document.createElement('td');
	    numHits.setAttribute('class','num-hits');
	    numHits.textContent = newpair[1];
	var deleteBtn = document.createElement('button');
	    deleteBtn.setAttribute('class','delete');
	    deleteBtn.textContent = 'Delete';
	
	var btnCell = document.createElement('td');
	    btnCell.appendChild(deleteBtn);
	var patternRow = document.createElement('tr');
	    patternRow.appendChild(urlText);
	    patternRow.appendChild(numHits);
	    patternRow.appendChild(btnCell);
	
	// attach listener to delete button
	// much easier to do an 'inline function' so I have access to the 'newpair' variable
	deleteBtn.addEventListener('click',(e) => {
		// delete the row, hopefully
		const evtTgt = e.target;
		evtTgt.parentNode.parentNode.parentNode.removeChild(evtTgt.parentNode.parentNode);
		// send message to BG script
		removeStorage(newpair[0]);
		// remove from sorted global list
		globalstorage.splice(globalstorage.indexOf(newpair),1);
	})

	// turn pos number into a node or null
	//console.log(patternTable.childNodes);
	//console.log(patternTable.childNodes.length);
	var beforeme = null;
	if(patternTable.childNodes.length > (pos + 4)) {
		beforeme = patternTable.childNodes[pos + 4];
	}
	
	// do the insertNode thing
	patternTable.insertBefore(patternRow, beforeme);
}


// validateInput:
function validateInput(rawinputstring) {
	let WIP = rawinputstring.replace(/\n/gm,'');// remove all newlines, from anywhere
	WIP = WIP.replace(/^\s+|\s+$/g,'');			// remove whitespace from the ends
	WIP = WIP.replace(/\*+/g,'*');				// compress multi-stars
	if(WIP == '') {
		return '';
	}
	// compare against known safe sites
	if(WIP.match(/mozilla/i) || WIP.match(/yahoo/i) || 
	   WIP.match(/google/i)  || WIP.match(/gmail/i) ){
		myWarning("Err: this pattern '" + WIP + "' might be a known-safe website!");
		return '';
	}
	// check total length (if pattern is too short, increases chance of false positive)
	if(WIP.length < patterntoosmall) {
		myWarning("Err: the given pattern '" + WIP + "' is dangerously short.");
		return '';
	}
	// check if it's already an existing pattern
	for (let thing of globalstorage) {
		if(WIP == thing[0]) {
			return ''; // abort quietly
		}
	}
	return WIP;
}

function myWarning(errtext) {
	var errspot = document.querySelector('.errorparagraph');
	errspot.textContent = errtext;
	console.error("PopupKiller balloon warning: " + errtext);
}

function onError(error) {
	console.error("PopupKiller balloon error: " + Object.entries(error));
}

// v1.2: decided I want it to sort by # of hits
function mySort(a,b) {
	let x = b[1] - a[1];
	if(x!=0) {
		return x;
	} else {
		return a[0].localeCompare(b[0]);
	}
}



function removeStorage(urltoremove) {
	var removingItem = browser.storage.local.remove(urltoremove);
	removingItem.then(() => {
		console.log("PopupKiller balloon: removed " + urltoremove + " from klist");
		notifyBG();
	}, onError);
}

function addStorage(urltoadd) {
	var setting = browser.storage.local.set( { [urltoadd] : 0 } );
	setting.then(() => {
		console.log("PopupKiller balloon: added " + urltoadd + " to klist");
		notifyBG();
	}, onError);
}



function notifyBG() {
	var sending = browser.runtime.sendMessage({  PUKupd: "confirm"  });
	sending.then(() => {
		console.log("PopupKiller balloon: message: update klist");
	}, onError);  
}

/*
function notifyBGadd(urltosend) {
	var sending = browser.runtime.sendMessage({  PUKadd: urltosend  });
	sending.then(() => {
		console.log("PopupKiller balloon: message: add " + urltosend + " to klist");
	}, onError);  
}

function notifyBGremove(urltosend) {
	var sending = browser.runtime.sendMessage({  PUKrem: urltosend  });
	sending.then(() => {
		console.log("PopupKiller balloon: message: remove " + urltosend + " from klist");
	}, onError);  
}
*/

