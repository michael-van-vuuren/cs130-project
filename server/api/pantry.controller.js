import PantryDAO from '../dao/pantryDAO.js'
import UnitConverter from '../utility/unit.js'

/**
 * Controller class for Pantry management functionality.
 * @class PantryController
 */
class PantryController {
  /**
   * Add a user pantry to DB.
   *
   * @static
   * @async
   * @function
   * @param {Object} req
   * @param {string} req.user - The user id.
   * @param {string} req.name - The user's name.
   * @param {string|Error} res - The new user sub.
   */
  static async apiAddUser(req, res, next) {
    try {
      const user = req.body.user
      const name = req.body.name
      const pantry = []

      const userAdded = await PantryDAO.addUser(
        user,
        name,
        pantry
      )
      let _id = userAdded.insertedId.toString()
      res.json({ _id: _id, status: 'success' })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  }

  /**
   * Check if user pantry exists in DB.
   *
   * @static
   * @async
   * @function
   * @param {Object} req
   * @param {string} req.sub - The user sub.
   * @param {string|Error} res - The new user MongoDB _id.
   * @returns Returns null if sub not found.
   */
  static async apiUserExists(req, res, next) {
    try {
      let sub = req.params.sub
      let user = await PantryDAO.checkUserExists(sub)
      if (!user) {
        res.status(404).json({ error: 'cannot find user' })
        return
      }
      let _id = user._id
      res.json({ _id: _id, status: 'success' })
    } catch (e) {
      res.status(500).json({ error: e })
    }
  }


  /**
   * Get user pantry ingredients.
   *
   * @static
   * @async
   * @function
   * @param {Object} req
   * @param {string} req.id - The user id.
   * @param {User|Error} res - The user object in DB.
   * @returns Returns null if sub not found.
   */
  static async apiGetPantry(req, res, next) {
    try {
      let id = req.params.id

      let userData = await PantryDAO.getUserData(id)
      if (!userData) {
        const errorResponse = { status: 'error', error: 'cannot find user' }

        if (res) { res.status(404).json(errorResponse) }
        else { return errorResponse }
      }
      const successResponse = { status: 'success', data: userData || [] }

      // switch that sends output to res on external call, returns on internal server call
      if (res) { res.json(successResponse) }
      else { return successResponse }

    } catch (e) {
      console.log(`api, ${e}`)
      const errorResponse = { status: 'error', error: e }
      if (res) { res.status(500).json(errorResponse) }
      else { return errorResponse }
    }
  }

  /**
   * Update the ingredients in a user's pantry.
   *
   * @static
   * @async
   * @function
   * @param {Object} req
   * @param {string} req.userId - The user id.
   * @param {Ingredient[]} req.newPantry - The pantry object to be added.
   * @param {Success|Error} res - Responds with success or error.
   * @returns Returns null if user not found.
   */
  static async apiUpdatePantry(req, res, next) {
    try {
      const userId = req.params.id
      const newPantry = req.body.pantry

      const existingUserData = await PantryDAO.getUserData(userId)
      if (!existingUserData) {
        res.status(400).json({ error: 'cannot find user' })
        return
      }

      console.log('PANTRY', newPantry)
      const newPantrySI = UnitConverter.convertPantryToSI(newPantry)
      console.log('CONVERTED-PANTRY', newPantrySI)
      console.log('new', newPantrySI)
      const combinedPantry = PantryController.combinePantries(existingUserData.pantry, newPantrySI)

      const result = await PantryDAO.updateUserPantry(userId, combinedPantry)
      if (result.error) {
        res.status(500).json({ error: result.error })
        return
      }
      res.json({ status: 'success' })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  }

  static combinePantries(existingPantry, newPantry) {
    const combinedPantry = [...existingPantry] // copy current pantry

    for (const newItem of newPantry) {
      const existingItemIndex = combinedPantry.findIndex(item => item.id === newItem.id)

      if (existingItemIndex !== -1) {
        // ingredient already in pantry, increment the quantity
        combinedPantry[existingItemIndex].quantity += newItem.quantity
      } else {
        // new ingredient, add new entry to the pantry
        combinedPantry.push(newItem)
      }
    }

    return combinedPantry
  }

  /**
   * Delete an ingredient in a user's pantry.
   *
   * @static
   * @async
   * @function
   * @param {Object} req
   * @param {string} req.id - The user id.
   * @param {number} req.deleteme - The ingredient id to be deleted.
   * @param {Success|Error} res - Responds with success or error.
   */
  static async apiDeletePantryItem(req, res, next) {
    try {
      const userId = req.params.id
      const idToDelete = req.body.deleteme

      if (!userId || !idToDelete) {
        res.status(400).json({ error: 'userId and id are required.' })
        return
      }

      const result = await PantryDAO.deletePantryItem(userId, idToDelete)
      if (result.modifiedCount === 0) {
        res.status(400).json({ error: 'user does not have that item' })
        return
      }
      if (result.error) {
        res.status(500).json({ error: result.error })
        return
      }
      res.json({ status: 'success' })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  }

}

export default PantryController