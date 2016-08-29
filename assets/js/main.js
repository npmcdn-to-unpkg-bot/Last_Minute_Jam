var myApp = {};


//user enters their location. Use mapquestapi to convert input into lat and long values

//bandsintown api endpoint: http://api.bandsintown.com/events/search
myApp.geoUrl = 'https://www.mapquestapi.com/geocoding/v1/address';
myApp.geoKey = 'RNRZNndoBDG4MS0SllzdUgQqqakeaC6n';
myApp.bandsUrl = 'https://api.bandsintown.com/events/search.json';
myApp.bandsName = 'makePlansApp'; 
myApp.today = moment().format('YYYY-MM-DD');


myApp.overlayFadeIn = function() {
	$('.start-overlay').fadeIn();
	$('.start-overlay').html(`<div class="loading-image"><div class="spinner"><img src="assets/images/ring-alt.svg"><p>Finding shows in your area</p></div></div>`);
	$('.start-overlay').delay(3000).fadeOut();
	//Would need to return my promises to make this method work. With the forEach I'm using I don't think I can tell which call is the last
	// $(document).ajaxStart(function() {
 //        $('.start-overlay').html(`<div class="loading-image"><img src="assets/images/ring-alt.gif"></div>`);
 //    }).ajaxComplete(function() {
 //        $('.start-overlay').fadeOut();
 //    });
}

myApp.responsivePlaceholder = function() {
	if ($(window).width() < 768 ) {
    	$('input[id="overlay-user-location"]').attr('placeholder', 'Enter Location');
	} else { 
		$('input[id="overlay-user-location"]').attr('placeholder', 'Your postal/zip code, or Neighborhood,City');
	}
};

myApp.geolocationEvents = function() {
	if('geolocation' in navigator){
	   navigator.geolocation.getCurrentPosition(success, error, options);
	   $('.geolocation').hide();
	   $('.geo-wait').show();
	} else {
		alert('Your browser does not support geolocation. Please enter your location manually')
	}
	var options = {
	// enableHighAccuracy = should the device take extra time or power to return a really accurate result, or should it give you the quick (but less accurate) answer?  
	   enableHighAccuracy: false, 
	// timeout = how long does the device have, in milliseconds to return a result?
	   timeout: 5000,  
	// maximumAge = maximum age for a possible previously-cached position. 0 = must return the current position, not a prior cached position
	   maximumAge: 0 
	};
	function success(pos){
		var latitude = pos.coords.latitude;
		var longitude = pos.coords.longitude;
		//need array to pass to leaflet
		myApp.latLong = [latitude, longitude];
		//pass user coords to leaflet to render map
		myApp.map.panTo(myApp.latLong); 
		//make a marker for user location and add to marker layer
		myApp.marker = L.marker(myApp.latLong); 
		myApp.markerArray.push(myApp.marker);
		//hit bands in town api to get events
		myApp.findEvent(myApp.latLong.join(','), myApp.today);
		//fade in loading screen
		$('.geo-wait').hide();
		$('.geolocation').show();
		$('#mapid').show();
		myApp.overlayFadeIn();
	}
	function error(err){
		if (err.code == 0) {
		    // Unknown error
		    alert('unknown error');
		}
		if (err.code == 1) {
		    // Access denied by user
		    alert('Access denied by user');
		}
		if (err.code == 2) {
		    // Position unavailable
		    alert('position unavailable');
		}
		if (err.code == 3) {
		    // Timed out
		    alert('timed out');
		}
	}
};

myApp.resetMap = function() {
	if(myApp.group) {
		myApp.group.clearLayers();
	};
	myApp.markerArray = [];
};
 
myApp.searchAgain = function() {
	$('.near-user').on('submit', function(e) {
		e.preventDefault();
		myApp.resetMap();
		//collect user input
		var searchTerm = $('input[id=user-location]').val();
		$('input[name=user-location]').val('');
		myApp.overlayFadeIn();
		myApp.findUser(searchTerm);
	});
	$('.retry-geoLocation').on('click', function() {
		//user wants to use their current location
		myApp.resetMap();
		myApp.geolocationEvents();	
	});
}


myApp.findUser = function(query) {
	$.ajax({
		url: myApp.geoUrl,
		method: 'GET',
		inFormat: 'json',
		data: {
			key: myApp.geoKey,
			location: query
		}
	}).then(function(userLocation) {
		// //drill down through data to find the lat & long, concatenate them into one variable
		// //Feed user location to bands in town API
		
		userLocation.results.forEach(function(result) {
		    result.locations.forEach(function(location) {
		    	myApp.specificLocation = [location.latLng.lat, location.latLng.lng];
		    });
		});
		// myApp.findEvent(myApp.specificLocation.join(‘,’), today);
		if(myApp.specificLocation) {

		    // take the first one
		    myApp.map.panTo(myApp.specificLocation);  
		    //make a marker for user location and add to marker layer
		    myApp.marker = L.marker(myApp.specificLocation);
		    myApp.markerArray.push(myApp.marker);
		      
		    // also, pass coordinates to bands in town API
		    myApp.findEvent(myApp.specificLocation.join(','), myApp.today);
		}
	});
};

myApp.map = L.map('mapid', {
	scrollWheelZoom: false,
	zoom: 15,
	minZoom: 5,
	maxZoom: 20
});

//add a basemap layer
L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1Ijoicm9zYWxlYWdhdXRoaWVyIiwiYSI6ImNpcmpiMHN3MjAwMWlmZm04NTR4cm02ZDYifQ.MKQSdvygxbrKPi35zfot6g', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 20
}).addTo(myApp.map);


// Define a custom icon to use as a marker
myApp.locationIcon = L.icon({
	iconUrl: 'assets/images/musicmarker.svg', // the image we want to use
	iconSize: [30, 30], // dimensions of the icon
	iconAnchor:   [15, -5], // point of the icon which will correspond to marker's location
	popupAnchor: [0, 12.5] // position of the popup relative to the icon
});

myApp.markerArray = [];

//make a call to the BiT API, search events. Search params: lat and long +- radius, time of show + 24 hours?

myApp.findEvent = function(location, currentDate) {
	$.ajax({
		url: 'https://proxy.hackeryou.com',
		method: 'GET',
		format: 'json',
		data: {
			reqUrl: myApp.bandsUrl,
			params: {
				location: location,
				radius: 2,
				app_id: myApp.bandsName,
				api_version: '2.0',
				date: currentDate
			}
		}
	}).then(function(eventsInArea) {
		myApp.getSpotifyTracks(eventsInArea);
	});
};

// myApp.getSpotifyTracks = function(events) {
// 	$('.results-container').empty();

// 	events.forEach(function(item) {
// 		var artistsArray = item.artists.forEach(function(artist, index) {
// 			myApp.sampleMusic(artist, item);
// 			// console.log(artist);
// 		});
// 	});
// };

myApp.getSpotifyTracks = function(events) {
	events.reduce(function(promise, item) {
		return promise.then(function() {
			return new Promise(function (resolve) {
				item.artists.forEach(function(artist, index) {
					myApp.sampleMusic(artist, item).then(function () {
						resolve();
					});
				});
			});
		});
	}, Promise.resolve());
};

 myApp.sampleMusic = function(artist, eventDetails) {
 	return $.ajax({
 		url: 'https://api.spotify.com/v1/search',
 		method: 'GET',
 		format: 'json',
 		data: {
 			type: 'artist',
 			q: artist.name
 		}
 	}).then(function(spotifyArtist) {	
 		var spotifyArtistArray = spotifyArtist.artists.items;
 		var filteredSpotifyArtistArray = spotifyArtistArray.filter(function(value) {
 			return value.name === artist.name;
 		});
 		if (filteredSpotifyArtistArray.length > 0) {
 			var artistId = filteredSpotifyArtistArray[0].id;
 			if (artistId !== undefined) {
 				myApp.getPopularTracks(artistId, eventDetails);
 			} 
 		} else {
 			myApp.displayEvents(eventDetails, '<div class="noPlaycard"><p>This artist is not listed in Spotify. Check them out at the venue!</p></div>');
 		}
 	});
 };

 myApp.getPopularTracks = function(id, eventDetails) {
 	$.ajax({
 		url: 'https://api.spotify.com/v1/artists/' + id + '/top-tracks',
 		method: 'GET',
 		format: 'json',
 		data: {
 			country: 'CA'
 		}
 	}).then(function(popularTracks) {
 		if (popularTracks.tracks.length > 0) {
 			var sampleSong = popularTracks.tracks[0].uri
 		}

 		var songPlayer = `<iframe frameborder="0" allowtransparency="true" src="https://embed.spotify.com/?uri=	${sampleSong}" width="200" height="200">`;

 		myApp.displayEvents(eventDetails, songPlayer);
 	});
 };

 myApp.displayEvents = function(eventDetails, playcard) {

 	var displayArtistsArray = eventDetails.artists.map(function(item) {
 		return item.name;
 	});

 	var venueCoordinates = [eventDetails.venue.latitude, eventDetails.venue.longitude];
 	var completeBilling = displayArtistsArray.join(' <br> ');
 	var showVenue = eventDetails.venue.name;
 	var ticketurl = eventDetails.ticket_url;
 	var showTime = eventDetails.datetime;
 	var time = moment(showTime, 'hh:mm:ss').format('h:mmA');
 	myApp.marker = L.marker(venueCoordinates, {
		icon: myApp.locationIcon, // the icon we created above
		title: completeBilling, // some title text when we hover over the marker
		alt: `marker showing location of ${completeBilling}`, // a fallback in case the image doesn't load
		draggable: false // we don't want to be able to move the marker around
	});

	myApp.markerArray.push(myApp.marker);
	myApp.group = L.featureGroup(myApp.markerArray);//.addTo(myApp.map);
	myApp.map.addLayer(myApp.group);
	myApp.map.fitBounds(myApp.group.getBounds());

 	myApp.marker.bindPopup(
 		`<div class="info clearfix"><span class="label">Who</span><div class="complete-billing details">${completeBilling}</div></div>
 		<div class="info clearfix"><span class="label">When</span><span class="time details">${time}</span></div>
 		<div class="info clearfix"><span class="label">Where</span><span class="details">${showVenue}</span></div>
 		<a href="${ticketurl}" class="tickets" target='blank'>Buy Tickets</a>${playcard}`
 		);
 };

myApp.init = function() {
	// myApp.findUser('Charlottetown,PE');
	myApp.responsivePlaceholder();
	$('.overlay-near-user').on('submit', function(e) {
		e.preventDefault();
		var searchTerm = $('input[id=overlay-user-location]').val();
		$('input[name=user-location]').val('');
		//pass user input to mapquest api to get coords
		myApp.findUser(searchTerm);
		//fade in loading screen
		myApp.overlayFadeIn();
	});
	$('.locator').on('click', function() {
		//user wants to use their current location
		myApp.geolocationEvents();
	});
	if (matchMedia('only screen and (max-width: 768px)').matches) {
		$('.manual-location').show();
	} else {
		$('.option').on('click', function() {
			console.log('clicked');
			$('.manual-location').slideToggle('.manual-location');
		});
	}
	myApp.searchAgain();
};

$(function() {
	myApp.init();
}); //doc ready