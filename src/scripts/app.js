'use strict'
import {FireBaseQuizzApp} from './firebase/firebase.js';
import {FireBaseAuth} from './firebase/firebaseAuth.js';
import {Game} from './game/game.js';


(function () {

	let fireBaseQuizz = null, // the reference of the fireBaseApp
		fireBaseAuth = null,
		index = 0,
		isAdmin = false,
		isConnected = false,
		gameInit = false,
		questionService = null,
		registrationServiceWorker = null;


	function initGame() {
		new Game({
			btnIndex: 'btnAnwser',
			btnNumbers : 3,
			isConnected : isConnected,
			isAdmin : isAdmin,
			firebaseApp : fireBaseQuizz,
			firebaseAuth : fireBaseAuth
		});

	}

	function pageLoad() {

		fireBaseQuizz = new FireBaseQuizzApp().app;

		// We init the authentication object
		fireBaseAuth = new FireBaseAuth({
			idDivLogin: 'login-msg',
			idNextDiv: 'hello-msg',
			idLogout: 'signout',
			idImg: "img-user",
			idDisplayName: "name-user"
		});

		fireBaseAuth.onAuthStateChanged((user)=>{
			isConnected = user;
			if (user){
				fireBaseQuizz.database().ref("/admins").once('value', (snapshot)=>{
					isAdmin = true;
					document.getElementById('menu-admin').removeAttribute('hidden');
				}, (err)=>{
					console.error('not authorized !');
				});
			}
		});


		/**
		 * Management of Cinematic Buttons
		 */
		const startBtn = document.getElementById('startBtn');
		const consultBtn = document.getElementById('consultBtn');

		const streamStart = Rx.Observable
			.fromEvent(startBtn, 'click')
			.map(() => 'start');

		const streamConsult = Rx.Observable
			.fromEvent(consultBtn, 'click')
			.map(() => 'consult');


		streamStart.merge(streamConsult)
			.subscribe((state) => {
				if (state === 'start') {
					document.getElementById('hello-msg').setAttribute("hidden", "");
					document.getElementById('game').removeAttribute('hidden');
					if (!gameInit) {
						gameInit = true;
						initGame();
					}
				}else if (state === 'consult') {
					document.getElementById('login-msg').setAttribute("hidden", "");
					document.getElementById('hello-msg').setAttribute("hidden", "");
					document.getElementById('game').removeAttribute('hidden');
					if (!gameInit) {
						gameInit = true;
						initGame();
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
					fireBaseQuizz.database().ref('anwsers').once('value', (snapshotAnwsers)=>{
						const anwsers = snapshotAnwsers.val();
						if (anwsers){
							const keyQuestions = Object.keys(anwsers);
							keyQuestions.forEach(questionEntry=>{
								const questionTmp = anwsers[questionEntry];
								const userKeys = Object.keys(questionTmp);
								userKeys.forEach(userId=>{
									const userTmp = questionTmp[userId];
									delete userTmp.treat;
								});
							});

							fireBaseQuizz.database().ref('anwsers').update(anwsers);
						}
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


		checkUpdateVersion();

	}

	function checkUpdateVersion(){
		if (!fireBaseQuizz || !registrationServiceWorker){
			return;
		}
		// We check for updating or not the service worker according to the version of app
		fireBaseQuizz.database().ref('currentQuestion').on('value', (snaphotCurrentQuestion)=>{
			const currentQuestion = snaphotCurrentQuestion.val();
			if (currentQuestion){
				if (localStorage['appVersion'] && localStorage['appVersion'] != ''+currentQuestion.appVersion){
					console.debug('Detect a new version => update is request')
					if ('serviceWorker' in navigator){
						localStorage.removeItem('serviceWorkerUpdateDone');
						localStorage.removeItem('serviceWorkerUpdate');
						registrationServiceWorker.update();
					}else{
						location.reload();
					}


				}
				localStorage['appVersion'] = currentQuestion.appVersion;
			}
		});

	}


	window.addEventListener('load', pageLoad);

	/* SERVICE_WORKER_REPLACE
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.register('./service-worker.js', {scope : location.pathname}).then(function(reg) {
			console.log('Service Worker Register for scope : %s',reg.scope);
			registrationServiceWorker = reg;
			checkUpdateVersion();
			reg.addEventListener('updatefound', function(){
				console.debug('update service worker found !');
				localStorage['serviceWorkerUpdate'] = true;
				if (!localStorage['serviceWorkerUpdateDone']){
					location.reload();
				}
			});
			var serviceWorker;
			if (reg.active) {
				serviceWorker = reg.active;
				console.debug('Service Worker is Active, will refresh !');
				if (localStorage['serviceWorkerUpdate']){
					localStorage.removeItem('serviceWorkerUpdate');
					if (!localStorage['serviceWorkerUpdateDone']){
						location.reload();
					}
					localStorage['serviceWorkerUpdateDone'] = true;
				}
			}

		});
	}
	 SERVICE_WORKER_REPLACE */

})();
