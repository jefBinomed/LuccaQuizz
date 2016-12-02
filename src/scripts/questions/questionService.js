'use strict';
import {Question} from './question';

export class QuestionService{
	constructor(){
		const SPREADSHEET_KEY = '1AH5TR7gRkWF4BK9j7AEWxcMxQ7iCNlCfTEZMZZmVkX0';
		const URI = `https://spreadsheets.google.com/feeds/list/${SPREADSHEET_KEY}/od6/public/values?alt=json`;

		fetch(URI,
		{
			method: 'GET'
		}
		)
		.then((response)=>response.json())
		.then((json)=>{
			console.info(json);
		});
	}
}