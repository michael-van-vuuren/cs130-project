import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import PantryCtrl from './pantry.controller.js'
import RecipeCalc from '../utility/getPossibleRecipes.js'
import RecipeDisplayScraperController from './recipe-display-scraper.controller.js'
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Controller class for Recipe Pool functionality.
 * @class RecipeController
 */
class RecipeController {
  static async fetchData(filePath) {
    try {
      const data = await readFile(filePath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      console.error('error reading or parsing data:', error)
      throw error
    }
  }

/**
* @typedef {Object} Recipe
* @property {number} id - Id
* @property {string} name - Name
* @property {string} description - Description
* @property {string} short - Short
*/

  /**
   * Get the list of Recipes that can be made with ingredients in Pantry.
   *
   * @static
   * @async
   * @function
   * @param {Object} req
   * @param {numbers} req.threshold - The permitted number of missing ingredients.
   * @param {Recipe[]} res
   * @param {Object} res.recipe
   * @param {number} res.recipe.id - The id of a recipe.
   * @param {string} res.recipe.name - The name of a recipe.
   * @param {string} res.recipe.description - The Wikipedia HTML form of a recipe.
   * @param {string} res.recipe.short - The first paragraph of a recipe.
   * @param {Success} res.success 
   * @param {Error} res.error
   */
  static async serverGetRecipePool(req, res, next) {
    try {
      // get threshold and id
      let threshold = req.params.threshold

      // get recipes
      const filePath = join(__dirname, '../resources/recipe-with-ingredients2.json')
      const recipes = await RecipeController.fetchData(filePath)

      // get pantry
      const pantryResponse = await PantryCtrl.apiGetPantry(req)
      if (pantryResponse.status === 'error') {
        console.error('Pantry API error:', pantryResponse.error)
        res.status(500).json({ error: 'internal server error' })
        return
      }
      const pantry = pantryResponse.data.pantry
      const possibleRecipes = RecipeCalc.calculateRecipePool(pantry, recipes, threshold)

      const displayReadyRecipes = await Promise.all(possibleRecipes.map(async recipe => {
        try {
          const stdoutData = await RecipeDisplayScraperController.getRecipeDisplay(recipe.link);
          // console.log('Received stdout', stdoutData);

          const dom = new JSDOM(stdoutData);
          const document = dom.window.document;

          const mwBodyContentParagraphs = document.querySelectorAll('.mw-body-content p');
          const shortDescription = Array.from(mwBodyContentParagraphs).map(paragraph => paragraph.textContent.trim()).join(', ');

          // Now, you can return the result from the mapping function
          return {
            id: recipe.id,
            name: recipe.name,
            description: stdoutData,
            short: shortDescription
          };
        } catch (error) {
          console.error('Error:', error);
          // Handle the error here, you might want to return some default values or handle it accordingly
          return {
            id: recipe.id,
            name: recipe.name,
            description: 'Error fetching description',
            short: 'Error fetching short description'
          };
        }
      }));
      res.json({ status: 'success', recipes: displayReadyRecipes })

    } catch (error) {
      console.error('unexpected error:', error)
      res.status(500).json({ error: 'internal server error' })
    }
  }

}

export default RecipeController
