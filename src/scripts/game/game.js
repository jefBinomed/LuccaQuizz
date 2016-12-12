'use strict';
import {QuestionService} from '../questions/questionService.js';
import {Question} from '../questions/question.js';
const appVersion = 1;

class ModelGame{
	constructor(){
		this.indexQuestion = 0; // Start from 0 !
		this.currentAnswer = -1; // -1 === no validate anwser
		this.isAdmin = false;
		this.isConnected = false;
		this.score = 0;
	}
}

export class Game{
	constructor({btnIndex = 'btnAnwser', btnNumbers = 3, isConnected = false, isAdmin = false, firebaseApp, firebaseAuth}){
		// Manage html
		this.regex = new RegExp(btnIndex+'([0-9])');
		this.btns = new Array();
		for (let i = 1; i <= btnNumbers; i++){
			let btn = document.getElementById(`${btnIndex}${i}`);
			this.btns.push(btn);
			if (isConnected){
				btn.addEventListener('click', this._clickAnwser.bind(this));
			}
		}
		// Manage html elements
		this.eltTitle = document.getElementById('questionTitle');
		this.eltHelp = document.getElementById('help');
		this.eltGame = document.getElementById('game');
		this.eltScores = document.getElementById('scores');

		// Add btns
		this.btnConfirm = document.getElementById('confirmBtn');
		this.btnNext = document.getElementById('btnRight');
		this.btnPrev = document.getElementById('btnLeft');

		// Model
		this.model = new ModelGame();
		this.model.isAdmin = isAdmin;
		this.model.isConnected = isConnected;

		this.questionArray = new Array();

		// FireBase
		this.firebaseApp = firebaseApp;
		this.firebaseAuth = firebaseAuth;

		this._initGame();
	}

	/**
	 * Init services / questions / ...
	 */
	_initGame(){
		// Start the service
		const questionService = new QuestionService();
		questionService.retrieveQuestions()
		.then(questionArray=>{
			this.questionArray = questionArray;
			this._fillQuestion(questionArray[0]);
		});

		// Manage visibility
		this.btnConfirm.setAttribute('hidden', '');
		if (!this.model.isAdmin){
			this.eltHelp.setAttribute('hidden', '');
			this.btnNext.setAttribute('hidden', '');
			this.btnPrev.setAttribute('hidden', '');
			if (this.model.isConnected){
				// We init the tree of score with the name of user
				this.firebaseApp.database().ref(`scores/${this.firebaseAuth.userId()}`).update({
					user : this.firebaseAuth.displayName()
				});
			}

			this.firebaseApp.database().ref('currentQuestion').on('value', this._updateData.bind(this));
		}else if(this.model.isConnected){
			// Add interactivity
			const streamLeft = Rx.Observable.fromEvent(this.btnPrev, 'click')
				.map(() => 'prev');

			const streamRight = Rx.Observable.fromEvent(this.btnNext, 'click')
				.map(() => 'next');

			const streamConfirm = Rx.Observable.fromEvent(this.btnConfirm, 'click')
				.map(() => 'confirm');

			streamLeft.merge(streamRight)
				.merge(streamConfirm)
				.subscribe((state) => {
					if (state === 'prev'){
						this.model.indexQuestion = Math.max(0, this.model.indexQuestion - 1);
						this._fillQuestion(this.questionArray[this.model.indexQuestion]);
					}else if (state === 'next'){
						this.model.indexQuestion = Math.min(this.questionArray.length, this.model.indexQuestion + 1);
						this._fillQuestion(this.questionArray[this.model.indexQuestion]);
					}else if (state === 'confirm'){
						this._computeResults();
					}
					this.firebaseApp.database().ref('currentQuestion').update({
						indexQuestion : this.model.indexQuestion,
						anwser : -1,
						appVersion : appVersion
					});
				});
		}
	}
	
	/**
	 * Calculate the results and update the tree
	 */
	_computeResults(){
		this.firebaseApp.database().ref(`anwsers/question${this.model.indexQuestion}`).once('value', (snapshot)=>{
			const fbSnapshot = snapshot.val();
			if (!fbSnapshot){
				console.warn('no results ! ');
				return;
			}

			const usersIdKeys = Object.keys(fbSnapshot);

			if (usersIdKeys.length > 0 && fbSnapshot[usersIdKeys[0]].treat){
				return;
			}

			// We will separate the good and the wrongs anwser
			const arrayGoodAnswer = new Array();
			const arrayWrongAnswer = new Array();

			usersIdKeys.forEach(userId =>{
				const anwserUser = fbSnapshot[userId];
				anwserUser.treat = true;
				if (anwserUser.anwser === this.model.currentAnswer){
					arrayGoodAnswer.push(anwserUser);
				}else{
					arrayWrongAnswer.push(anwserUser);
				}
			});


			// We only distribute 100 points the more people anwser good, the more the delta between users is short
			let pointToDistribute = 100;
			const delta = Math.round(pointToDistribute / arrayGoodAnswer.length);

			const promiseArray = new Array();

			// We update for good users
			arrayGoodAnswer
			.sort((anwserA, anwserB)=>{
				return anwserA.timestamp - anwserB.timestamp
			})
			.forEach(anwserUser=>{
				promiseArray.push(this.firebaseApp.database().ref(`scores/${anwserUser.user.id}/question${this.model.indexQuestion}`).set({
					score : pointToDistribute
				}));
				pointToDistribute -= delta;
			});

			// We set 0 as score for wrong anwsers
			arrayWrongAnswer.forEach((anwserUser)=>{
				promiseArray.push(this.firebaseApp.database().ref(`scores/${anwserUser.user.id}/question${this.model.indexQuestion}`).set({
					score : 0
				}));
			});

			// We check that all transfer are well complete
			Promise.all(promiseArray)
			.then(values=>{
				return true;
			})
			.catch(error=>{
				console.error(error);
				return false;
			})
			.then(_=>{
				this.firebaseApp.database().ref('scores').once('value', this._calculateResults.bind(this));
			});

			//We update the tree to tell that the node has already be treat
			this.firebaseApp.database().ref(`anwsers/question${this.model.indexQuestion}`).set(fbSnapshot);

		});
	}

	/**
	 * Update datas recieve from firebase
	 */
	_updateData(snapshot){
		// If no questions, we continue
		if (this.questionArray.length === 0){
			return;
		}
		if (snapshot.val()){
			// Each time there is an update in the game state (change question, validate anwser), we reset the buttons
			this._resetBtns();
			const valueQuestion = snapshot.val();
			// We update the local model
			this.model.indexQuestion = valueQuestion.indexQuestion;
			this._fillQuestion(this.questionArray[valueQuestion.indexQuestion]);
			// We check if the admin validate an anwser (anwser != -1)
			if (valueQuestion.anwser != -1){
				// If we're the consult screen, we hilight the correct anwser
				if (!this.model.isConnected){
					this.btns[valueQuestion.anwser - 1].classList.remove('mdl-button--accent');
					this.btns[valueQuestion.anwser - 1].classList.add('mdl-button--colored');
					setTimeout(() =>{
						// We will now request the results to display the rank of users
						this.firebaseApp.database().ref('scores').once('value', this._showResults.bind(this));
					}, 1000);
				}else{
					// Each user will look at it's position
					this.firebaseApp.database()
						.ref(`scores/${this.firebaseAuth.userId()}/question${valueQuestion.indexQuestion}/`)
						.once('value', this._showCurrentScore.bind(this));
				}

				// Else if we're  the consult screen (not connected) and the value is -1 => we have to show the question
			}else if (valueQuestion.anwser === -1 && !this.model.isConnected){
				this._hideResults();
			}
		}
	}

	/**
	 * Reset bouttons states
	 */
	_resetBtns(){
		this.btns.forEach(btn=>{
			btn.classList.remove('mdl-button--colored');
			btn.classList.add('mdl-button--accent');
		})
	}

	/**
	 * Callback method when click on an anwser button
	 */
	_clickAnwser(event){
		// We resets each buttons to be shure that we don't have 2 anwser selected on screen
		this._resetBtns();
		event.target.classList.remove('mdl-button--accent');
		event.target.classList.add('mdl-button--colored');
		const results = this.regex.exec(event.target.id);
		this.model.currentAnswer = (results.length > 0) ? +results[1] : -1;

		if (this.model.isAdmin){
			// If we are admin, we show the confirm button to validate the anwser
			this.btnConfirm.removeAttribute('hidden');
		}else if (this.model.currentAnswer != -1){
			// If we are a simple user, we validate our anwser on the firebase tree.
			this.firebaseApp.database().ref(`anwsers/question${this.model.indexQuestion}/${this.firebaseAuth.userId()}`)
				.set({
					timestamp : Date.now(),
					anwser : this.model.currentAnswer,
					user : {
						name : this.firebaseAuth.displayName(),
						id : this.firebaseAuth.userId()
					}
				});
		}
	}

	/**
	 * Fill the html elements with question
	 */
	_fillQuestion(question){
		this._resetBtns();
		this.btnConfirm.setAttribute('hidden', '');
		this.eltTitle.innerHTML = `Question ${this.model.indexQuestion + 1} / ${this.questionArray.length} : <br> ${question.title} `;
		this.eltHelp.innerHTML = question.help;
		let indexAnswer = 0;
		this.btns.forEach(btn=>{
			btn.innerHTML = question.list()[indexAnswer];
			indexAnswer++;
		})
	}

	/**
	 * Calculate the results and the score according to current question
	 */
	_calculateResults(snapshotResults){
		const valueResults = snapshotResults.val();
		const usersIdKeys = Object.keys(valueResults);

		const userArray = new Array();

		usersIdKeys.forEach(userId =>{
			const scoresUser = valueResults[userId];
			scoresUser.score = 0;
			scoresUser.userId = userId;
			for (let index = 0; index <= this.model.indexQuestion; index++){
				if (scoresUser[`question${index}`]){
					scoresUser.score += scoresUser[`question${index}`].score;
				}
			}
			userArray.push(scoresUser);
		});

		const promiseArray = new Array();

		userArray
		.sort((userA, userB)=>{
			return userB.score - userA.score;
		})
		.forEach((user, index)=>{
			if (!user[`question${this.model.indexQuestion}`]){
				user[`question${this.model.indexQuestion}`] = {score: 0};
			}
			user[`question${this.model.indexQuestion}`].scoreCompute = user.score;
			user[`question${this.model.indexQuestion}`].position = index + 1;

			promiseArray.push(this.firebaseApp.database()
				.ref(`scores/${user.userId}/question${this.model.indexQuestion}`)
				.set(user[`question${this.model.indexQuestion}`]));
		});

		Promise.all(promiseArray)
		.then(_=>true)
		.catch(error=>{
			console.error(error);
			return false;
		})
		.then(_=>{
			const tempAnswer = this.model.currentAnswer;
			this.firebaseApp.database().ref('currentQuestion').update({
				anwser : tempAnswer
			});
		});


	}


	/**
	 * Show the results on main screen
	 */
	_showResults(snapshotResults){

		// We play with the hide / show elements to hide game div and show scores div
		this.eltGame.classList.remove('show');
		this.eltGame.classList.add('hide');
		// We wait a litle (time for animation css of hiding game is finish)
		setTimeout(() =>{
			this.eltGame.setAttribute('hidden','');

			this.eltScores.removeAttribute('hidden');
			this.eltScores.classList.remove('hide');
			this.eltScores.classList.add('show');

			const userElt1 = document.getElementById('scoreUser1');
			const userElt2 = document.getElementById('scoreUser2');
			const userElt3 = document.getElementById('scoreUser3');
			const userElt4 = document.getElementById('scoreUser4');
			const userElt5 = document.getElementById('scoreUser5');

			// As we will show only 5 users, as we are not shure, that 5 people are in the game, we hide all the rows
			userElt1.setAttribute('hidden','');
			userElt2.setAttribute('hidden','');
			userElt3.setAttribute('hidden','');
			userElt4.setAttribute('hidden','');
			userElt5.setAttribute('hidden','');

			// We get the scores from firebase
			const valueResults = snapshotResults.val();
			const usersIdKeys = Object.keys(valueResults);

			const userArray = new Array();

			usersIdKeys
			.filter(userId =>{
				const scoresUser = valueResults[userId];
				return scoresUser[`question${this.model.indexQuestion}`];
			})
			.forEach(userId =>{
				const scoresUser = valueResults[userId];
				// We get the score calculate by the admin and set it as a reference
				scoresUser.score = scoresUser[`question${this.model.indexQuestion}`].scoreCompute;
				userArray.push(scoresUser);
			});

			// We sort the final array and only take the 5 first
			const finalUsers = userArray
			.sort((userA, userB)=>{
				return userB.score - userA.score;
			})
			.filter((elt, index)=>{
				return index < 5;
			});

			switch(finalUsers.length){
				case 5:
					userElt5.removeAttribute('hidden');
				case 4:
					userElt4.removeAttribute('hidden');
				case 3:
					userElt3.removeAttribute('hidden');
				case 2:
					userElt2.removeAttribute('hidden');
				case 1:
					userElt1.removeAttribute('hidden');
			}

			// Finally we show the name of the user and it's score'
			finalUsers.forEach((user, index)=>{
				let userEltTemp = userElt1;
				switch(index){
					case 1:
						userEltTemp = userElt2;
						break;
					case 2:
						userEltTemp = userElt3;
						break;
					case 3:
						userEltTemp = userElt4;
						break;
					case 4:
						userEltTemp = userElt5;
						break;
				}

				userEltTemp.querySelector('.user').innerHTML = `${index + 1} - ${user.user}`;
				userEltTemp.querySelector('.score').innerHTML = `${user.score} pts`;
			});
		}, 500);


	}

	/**
	 * Display the score and the position of a user
	 */
	_showCurrentScore(snapshotCurrent){
		const valueScoreUser = snapshotCurrent.val();
		if (valueScoreUser){
			const headerTitleElt = document.getElementById('header-title');
			headerTitleElt.innerHTML = `Quizz - ${valueScoreUser.position} - ${valueScoreUser.scoreCompute} pts`
		}
	}

	/**
	 * Simply hide the results
	 */
	_hideResults(){

		this.eltScores.classList.remove('show');
		this.eltScores.classList.add('hide');

		setTimeout(() =>{
			this.eltScores.setAttribute('hidden','');

			this.eltGame.removeAttribute('hidden');
			this.eltGame.classList.remove('hide');
			this.eltGame.classList.add('show');
		}, 500);


	}

}