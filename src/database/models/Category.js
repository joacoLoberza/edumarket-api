import nlp from 'compromise';
import natural from 'natural';
import _ from 'lodash';
import database from '../database.js';
import { Model, DataTypes } from 'sequelize';
import ServerError from '../../utils/ServerError.js';

class Category extends Model { };
Category.init(
	{
		id: {
			primaryKey: true,
			type: DataTypes.INTEGER,
			autoIncrement: true,
		},
		uiName: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
			validate: {
				is: {
					args: /^[\p{L}0-9 ]+$/u,
					msg: 'El nombre de la categoría deber ser alfanumérico.',
				},
			},
		},
		name: {
			type: DataTypes.STRING,
			unique: true,
			allowNull: true,
			validate: {
				isAlphanumeric: {
					msg: 'El nombre de la categoría deber ser alfanumérico.',
				},
			},
		},
		image: {
			type: DataTypes.STRING,
			defaultValue: process.env.DEF_CAT_IMG,
			validate: {
				isUrl: {
					msg: JSON.stringify(new ServerError(
						`The data provided isn't an url, can't reference the image in the database.`,
						{
							origin: 'sequelize',
							type: 'InvalidDataSent',
						}
					).toFlatObject()),
				}
			}
		}
	},
	{
		sequelize: database,
		paranoid: true,
	}
);

Category.beforeCreate((category) => {
	if (!category.uiName) {
		throw new ServerError('El nombre de la categoría es requerido', { origin: 'Category', type: 'ValidationError' });
	}
	const doc = nlp(category.uiName);
	const stemmer = natural.PorterStemmerEs;

	//Put the nouns in singular and the verbs in infinitive.
	doc.verbs().toInfinitive();
	doc.nouns().toSingular();

	//Create put the text in lower case and add it to the register.
	category.name = doc.text().toLowerCase();

	//Stem the verbs (quit the ending)
	category.name = category.name.split(/\s+/)
															 .map(word => stemmer.stem(word))
															 .join(" ");

	//Quit spelling rules, spaces and punctuation.
	category.name = category.name.replace(/qui/g, "qi")
															 .replace(/que/g, "qe")
															 .replace(/gue/g, "ge")
															 .replace(/gui/g, "gi")
															 .replace(/gue(?![ï])/g, "gue")
															 .replace(/gui(?![ï])/g, "gui")
															 .replace(/[^\w\s]/gi, "")
															 .replace(/\s+/g, "");
	//Quit accents.
	category.name = _.deburr(category.name);
})

Category.beforeUpdate((category) => {
	if (category.changed('uiName') || category.changed('name')) {
		if (!category.uiName) {
			throw new ServerError('El nombre de la categoría es requerido', { origin: 'Category', type: 'ValidationError' });
		}
		const doc = nlp(category.uiName);
		const stemmer = natural.PorterStemmerEs;

		//Put the nouns in singular and the verbs in infinitive.
		doc.verbs().toInfinitive();
		doc.nouns().toSingular();

		//Create put the text in lower case and add it to the register.
		category.name = doc.text().toLowerCase();

		//Stem the verbs (quit the ending)
		category.name = category.name.split(/\s+/)
																 .map(word => stemmer.stem(word))
																 .join(" ");

		//Quit spelling rules, spaces and punctuation.
		category.name = category.name.replace(/qui/g, "qi")
																 .replace(/que/g, "qe")
																 .replace(/gue/g, "ge")
															 	 .replace(/gui/g, "gi")
																 .replace(/gue(?![ï])/g, "gue")
																 .replace(/gui(?![ï])/g, "gui")
																 .replace(/[^\w\s]/gi, "")
																 .replace(/\s+/g, "");
		//Quit accents.
		category.name = _.deburr(category.name);
	} 
})

export default Category;