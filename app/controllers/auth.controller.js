require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const cloudinary = require("../config/cloudinary");
const responseFormatter = require("../helpers/responseFormatter");
const { Employee, Position, Unit } = require("../models");

class AuthController {
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      const clearEmail = email.toLowerCase();
      const salt = process.env.SALT;
      
      const user = await Employee.findOne(
      { 
        where: { email: clearEmail } ,
        attributes: {
          exclude: ["createdAt", "updatedAt"]
        },
        include: [
          {
            model: Position,
            attributes: ["id", "name"],
          },
          {
            model: Unit,
            attributes: ["id", "name"],
          },
        ],
      }
      );
      
      if (!user) {
        return res.status(404).json(responseFormatter.error(null, "User not foud!", res.statusCode));
      }
      
      if(!user.is_active) {
        return res.status(401).json(responseFormatter.error(null, "Your account is not active, please check your email!", res.statusCode));
      }

      const isMatch = await bcrypt.compare(password + salt, user.password);

      if (!isMatch) {
        return res.status(401).json(responseFormatter.error(null, "email or password doesn't match!", res.statusCode));
      }

      const token = jwt.sign({
        name: user.name,
        place_of_birth: user.place_of_birth,
        date_of_birth: user.date_of_birth,
        marital_status:  user.marital_status,
        gender: user.gender,
        position: user.Position.name,
        unit: user.Unit.name,
        date_entry: user.date_entry,
        phone: user.phone,
        email: user.email,
        photo: user.photo,
        role: user.role
      }, process.env.JWT_SIGNATURE_KEY);

      return res.status(200).json(responseFormatter.success(
        { 
          token, 
          user : {
            id: user.id,
            name: user.name,
            place_of_birth: user.place_of_birth,
            date_of_birth: user.date_of_birth,
            marital_status:  user.marital_status,
            gender: user.gender,
            position: user.Position.name,
            unit: user.Unit.name,
            date_entry: user.date_entry,
            phone: user.phone,
            email: user.email,
            photo: user.photo,
            role: user.role
          }
        }, "Authenticated", res.statusCode));
    } catch (error) {
      return res.status(500).json(responseFormatter.error(null, error.message, res.statusCode));
    }
  }

  static activation = async (req, res) => {
    try {
      const userId = JSON.parse(atob(req.params.token)).id
      const { photo, password } = req.body;

      const employee = await Employee.findByPk(userId);

      if (!employee) {
        return res.status(404).json(responseFormatter.error(employee, "User not found", res.statusCode));
      }

       // upload profile gallery to cloudinary
       let url = '';
       const uploader = async (path) => await cloudinary.uploads(path, 'Profile');

       const newPath = await uploader(photo)
       url = newPath.url

       const salt = process.env.SALT;
       const encryptedPassword = await bcrypt.hash(password + salt, 10);

      const retrivied = await Employee.update({
        photo: url,
        password: encryptedPassword,
        is_active: true
      }, {
        where: {
          id: userId
        }
      });

      return res.status(200).json(responseFormatter.success(retrivied, "your account has been successfully activate", res.statusCode));
    } catch (error) {
      return res.status(500).json(responseFormatter.error(null, error.message, res.statusCode));
    }
  }
}

module.exports = AuthController;