'use strict';
import {Question} from './question';
import {JSON_DATA} from './questionsJson.js';

export class QuestionService{
	constructor(){
		this.JSON_TEMP = JSON_DATA;
	}

	retrieveQuestions(){
		const SPREADSHEET_KEY = '1AH5TR7gRkWF4BK9j7AEWxcMxQ7iCNlCfTEZMZZmVkX0';
		const URI = `https://spreadsheets.google.com/feeds/list/${SPREADSHEET_KEY}/od6/public/values?alt=json`;
		const metaProcess = {
			questionColumn : 'question',
			anwserColums : ['answera', 'answerb', 'answerc'],
			helpColumn : 'explanation'
		};

		return fetch(URI,
		{
			method: 'GET'
		}
		)
		.then((response)=>response.json())
		.catch((e) => {
			return this.JSON_TEMP
		})
		.then((json)=>{
			if (json && json.feed && json.feed.entry){
				try{
					const questionsReformat = json.feed.entry.map((entry)=>{
						const questionTitle = entry[`gsx\$${metaProcess.questionColumn}`]['$t'];
						const help = entry[`gsx\$${metaProcess.helpColumn}`]['$t'];
						const propositions = new Array();
						metaProcess.anwserColums.forEach(col=>{
							propositions.push(entry[`gsx\$${col}`]['$t']);
						})
						return new Question(questionTitle, propositions, help);
					});
					console.info(questionsReformat);
					return questionsReformat;
				}catch(e){
					console.error(e);
					return Promise.reject(e);
				}
			}
		});
	}
}