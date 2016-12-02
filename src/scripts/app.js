'use strict'
import {FireBaseQuizzApp} from './firebase/firebase.js';
import {FireBaseAuth} from './firebase/firebaseAuth.js';


(function () {

	let fireBaseLego = null, // the reference of the fireBaseApp
		index = 0;


	function initGame() {


	}

	function pageLoad() {

		fireBaseLego = new FireBaseQuizzApp().app;
		// We init the authentication object
		let fireBaseAuth = new FireBaseAuth({
			idDivLogin: 'login-msg',
			idNextDiv: 'hello-msg',
			idLogout: 'signout',
			idImg: "img-user",
			idDisplayName: "name-user"
		});

		/**
		 * Management of Cinematic Buttons
		 */
		const startBtn = document.getElementById('startBtn');
		const helpBtn = document.getElementById('help')

		const streamStart = Rx.Observable
			.fromEvent(startBtn, 'click')
			.map(() => 'start');

		const streamHelp = Rx.Observable
			.fromEvent(helpBtn, 'click')
			.map(() => 'help');

		streamStart.merge(streamHelp)
			.subscribe((state) => {
				if (state === 'start') {
					document.getElementById('hello-msg').setAttribute("hidden", "");
					document.getElementById('game').removeAttribute('hidden');
					document.getElementById('color-picker2').removeAttribute('hidden');
					document.getElementById('help').removeAttribute('hidden');
					if (!gameInit) {
						document.getElementById('loading').removeAttribute('hidden');
						// Timeout needed to start the rendering of loading animation (else will not be show)
						setTimeout(function () {
								gameInit = true;
								initGame();
							document.getElementById('loading').setAttribute('hidden', '')
						}, 50);
					}
				} else if (state === 'help') {
					document.getElementById('hello-msg').removeAttribute("hidden");
					document.getElementById('game').setAttribute('hidden', "");
					document.getElementById('color-picker2').setAttribute('hidden', "");
					document.getElementById('help').setAttribute('hidden', "");
				}
			})


		/**
		 * Management of submission
		 */

		document.getElementById('btnSubmission').addEventListener('click', () => {
			// When we submit a draw, we save it on firebase tree
			fireBaseLego.database().ref("/draw").push(legoCanvas.export(fireBaseAuth.displayName(), fireBaseAuth.userId()));
		});

		/**
		 * Management of menu items
		 */

		const menuGame = document.getElementById('menu-game');
		const menuCreations = document.getElementById('menu-creations');


		const streamGame = Rx.Observable
			.fromEvent(menuGame, 'click')
			.map(() => 'game');

		const streamCreations = Rx.Observable
			.fromEvent(menuCreations, 'click')
			.map(() => 'creations');

		streamGame.merge(streamCreations)
			.subscribe((state) => {
				if (state === 'game'){
					document.querySelector('.page-content').removeAttribute('hidden');
					document.getElementById('submitted').setAttribute('hidden', '');
					document.getElementById('menu-game').setAttribute('hidden', '');
					document.getElementById('menu-creations').removeAttribute('hidden');
					document.querySelector('.mdl-layout__drawer').classList.remove('is-visible');
					document.querySelector('.mdl-layout__obfuscator').classList.remove('is-visible');

				}else if (state === 'creations'){
					document.querySelector('.page-content').setAttribute('hidden', '');
					document.getElementById('submitted').removeAttribute('hidden');
					document.getElementById('menu-game').removeAttribute('hidden');
					document.getElementById('menu-creations').setAttribute('hidden', '');
					document.querySelector('.mdl-layout__drawer').classList.remove('is-visible');
					document.querySelector('.mdl-layout__obfuscator').classList.remove('is-visible');

					fireBaseLego.database().ref(`drawSaved/${fireBaseAuth.userId()}`).once('value', function (snapshot) {
						if (snapshot && snapshot.val()) {
							console.log(snapshot.val());
							snapshotFb = snapshot.val();
							keys = Object.keys(snapshotFb);
							index = 0;
							draw();
						} else {
							console.log('no draw !');
						}

					}, function (err) {
						console.error(err);
						// error callback triggered with PERMISSION_DENIED
					});

				}
			});


		/**
		 * Management of Buttons for changing of draw
		 */

		const btnLeft = document.getElementById('btnLeft');
		const btnRight = document.getElementById('btnRight');

		const streamBtnLeft = Rx.Observable
			.fromEvent(btnLeft,'click',()=>index = Math.max(index - 1, 0));
		const streamBtnRight =  Rx.Observable
			.fromEvent(btnRight, 'click',()=>index = Math.min(index + 1, keys.length - 1));

	   streamBtnLeft.merge(streamBtnRight).subscribe(draw);


	}


	window.addEventListener('load', pageLoad);

	/* SERVICE_WORKER_REPLACE
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.register('./service-worker.js', {scope : location.pathname}).then(function(reg) {
			console.log('Service Worker Register for scope : %s',reg.scope);
		});
	}
	SERVICE_WORKER_REPLACE */

})();
