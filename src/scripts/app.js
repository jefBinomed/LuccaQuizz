'use strict'
import {FireBaseQuizzApp} from './firebase/firebase.js';
import {FireBaseAuth} from './firebase/firebaseAuth.js';
import {QuestionService} from './questions/questionService.js';


(function () {

	let fireBaseQuizz = null, // the reference of the fireBaseApp
		index = 0,
		isAdmin = false;


	function initGame() {


	}

	function pageLoad() {

		fireBaseQuizz = new FireBaseQuizzApp().app;
		// We init the authentication object
		let fireBaseAuth = new FireBaseAuth({
			idDivLogin: 'login-msg',
			idNextDiv: 'hello-msg',
			idLogout: 'signout',
			idImg: "img-user",
			idDisplayName: "name-user"
		});

		fireBaseAuth.onAuthStateChanged((user)=>{
			if (user){
				fireBaseQuizz.database().ref("/admins").once('value', (snapshot)=>{
					isAdmin = true;
					document.getElementById('menu-admin').removeAttribute('hidden');
				}, (err)=>{
					console.error('not authorized !');
				});
			}
		});

		new QuestionService();

		/**
		 * Management of Cinematic Buttons
		 */
		const startBtn = document.getElementById('startBtn');

		const streamStart = Rx.Observable
			.fromEvent(startBtn, 'click')
			.map(() => 'start');


		streamStart
			.subscribe((state) => {
				if (state === 'start') {
					document.getElementById('hello-msg').setAttribute("hidden", "");
					document.getElementById('game').removeAttribute('hidden');
					if (!gameInit) {
						document.getElementById('loading').removeAttribute('hidden');
						// Timeout needed to start the rendering of loading animation (else will not be show)
						setTimeout(function () {
								gameInit = true;
								initGame();
							document.getElementById('loading').setAttribute('hidden', '')
						}, 50);
					}
				}
			})


		/**
		 * Management of submission
		 */


		/**
		 * Management of menu items
		 */

		const menuGame = document.getElementById('menu-game');
		const menuAdmin = document.getElementById('menu-admin');


		const streamGame = Rx.Observable
			.fromEvent(menuGame, 'click')
			.map(() => 'game');

		const streamCreations = Rx.Observable
			.fromEvent(menuAdmin, 'click')
			.map(() => 'admin');

		streamGame.merge(streamCreations)
			.subscribe((state) => {
				if (state === 'game'){
					document.querySelector('.page-content').removeAttribute('hidden');
					document.getElementById('submitted').setAttribute('hidden', '');
					document.querySelector('.mdl-layout__drawer').classList.remove('is-visible');
					document.querySelector('.mdl-layout__obfuscator').classList.remove('is-visible');

				}else if (state === 'admin'){
					document.querySelector('.page-content').setAttribute('hidden', '');
					document.getElementById('submitted').removeAttribute('hidden');
					document.querySelector('.mdl-layout__drawer').classList.remove('is-visible');
					document.querySelector('.mdl-layout__obfuscator').classList.remove('is-visible');

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
