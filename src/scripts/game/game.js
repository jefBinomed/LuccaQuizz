'use strict';
import {QuestionService} from '../questions/questionService.js';
import {Question} from '../questions/question.js';
const appVersion = 1;

class ModelGame{
	constructor(){
		this.indexQuestion = 0;
		this.currentAnswer = -1;
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
			btn.addEventListener('click', this._clickAnwser.bind(this));
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
				this.firebaseApp.database().ref(`scores/${this.firebaseAuth.userId()}`).update({
					user : this.firebaseAuth.displayName()
				});
			}
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
					let tempAnswer = -1;
					if (state === 'prev'){
						this.model.indexQuestion = Math.max(0, this.model.indexQuestion - 1);
					}else if (state === 'next'){
						this.model.indexQuestion = Math.min(this.questionArray.length, this.model.indexQuestion + 1);
					}else if (state === 'confirm'){
						tempAnswer = this.model.currentAnswer;
						this._computeResults();
					}
					this.firebaseApp.database().ref('currentQuestion').set({
						indexQuestion : this.model.indexQuestion,
						anwser : tempAnswer,
						appVersion : appVersion
					});
				});
		}

		this.firebaseApp.database().ref('currentQuestion').on('value', this._updateData.bind(this));
	}

	/**
	 * Calculate the results and update the tree
	 */
	_computeResults(){
		this.firebaseApp.database().ref(`anwsers/question${this.model.indexQuestion}`).once('value', (snapshot)=>{
			const fbSnapshot = snapshot.val();
			const usersIdKeys = Object.keys(fbSnapshot);

			if (usersIdKeys.length > 0 && fbSnapshot[usersIdKeys[0]].treat){
				return;
			}

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


			let pointToDistribute = 100;
			const delta = pointToDistribute / arrayGoodAnswer.length;
			arrayGoodAnswer
			.sort((anwserA, anwserB)=>{
				return anwserA.timestamp - anwserB.timestamp
			})
			.forEach(anwserUser=>{
				this.firebaseApp.database().ref(`scores/${anwserUser.user.id}/question${this.model.indexQuestion}`).set({
					score : pointToDistribute
				});
				pointToDistribute -= delta;
			});

			//We update the tree to tell that the node has already be treat
			this.firebaseApp.database().ref(`anwsers/question${this.model.indexQuestion}`).set(fbSnapshot);

		});
	}

	/**
	 * Update datas recieve from firebase
	 */
	_updateData(snapshot){
		if (this.questionArray.length === 0){
			return;
		}
		if (snapshot.val()){
			this._resetBtns();
			const valueQuestion = snapshot.val();
			this.model.indexQuestion = valueQuestion.indexQuestion;
			this._fillQuestion(this.questionArray[valueQuestion.indexQuestion]);
			if (valueQuestion.anwser != -1 && !this.model.isConnected){
				this.btns[valueQuestion.anwser - 1].classList.remove('mdl-button--accent');
				this.btns[valueQuestion.anwser - 1].classList.add('mdl-button--colored');
				setTimeout(() =>{					
					this.firebaseApp.database().ref('scores').once('value', this._showResults.bind(this));
				}, 1000);
				
			}else if (valueQuestion.anwser === -1 && !this.model.isConnected){
				this._hideResults();
			}
		}else if (this.model.isAdmin){
			this.firebaseApp.database().ref('currentQuestion').set({
				indexQuestion : 0,
				anwser : -1,
				appVersion : appVersion
			});
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
		this._resetBtns();
		event.target.classList.remove('mdl-button--accent');
		event.target.classList.add('mdl-button--colored');
		const results = this.regex.exec(event.target.id);
		this.model.currentAnswer = (results.length > 0) ? +results[1] : -1;

		if (this.model.isAdmin){
			this.btnConfirm.removeAttribute('hidden');
		}else if (this.model.currentAnswer != -1){
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
		this.btnConfirm.setAttribute('hidden', '');
		this.eltTitle.innerHTML = `Question ${this.model.indexQuestion + 1} / ${this.questionArray.length} : <br> ${question.title} `;
		this.eltHelp.innerHTML = question.help;
		let indexAnswer = 0;
		this.btns.forEach(btn=>{
			btn.innerHTML = question.list()[indexAnswer];
			indexAnswer++;
		})
	}


	_showResults(snapshotResults){
		
		this.eltGame.classList.remove('show');
		this.eltGame.classList.add('hide');
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

			userElt1.setAttribute('hidden','');
			userElt2.setAttribute('hidden','');
			userElt3.setAttribute('hidden','');
			userElt4.setAttribute('hidden','');
			userElt5.setAttribute('hidden','');

			const valueResults = snapshotResults.val();
			const usersIdKeys = Object.keys(valueResults);

			const userArray = new Array();

			usersIdKeys.forEach(userId =>{
				const scoresUser = valueResults[userId];
				scoresUser.score = 0;
				for (let index = 1; index <= this.model.indexQuestion; index++){
					if (scoresUser[`question${index}`]){
						scoresUser.score += scoresUser[`question${index}`].score;
					}
				}
				userArray.push(scoresUser);
			});

			const finalUsers = userArray
			.sort((userA, userB)=>{
				return userA.score < userB.score;
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
				userEltTemp.querySelector('.score').innerHTML = user.score;
			});
		}, 500);


	}

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