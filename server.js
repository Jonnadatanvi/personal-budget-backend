const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const jwt = require('jsonwebtoken');

const app = express();
app.use(
  compression({
    threshold: 0,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb+srv://Tanvi:EMvsjnASIPS2fsga@cluster0.lxv64am.mongodb.net/PersonalBudget?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = mongoose.model('User', {
  name: String,
  email: String,
  password: String,
});

const Budget = mongoose.model('Budget', {
  budget_category: String,
  amount: Number,
  user_id: String,
});

const MonthlyExpense = mongoose.model('MonthlyExpense', {
  user_id: String,
  budget_id: String,
  expense_category: String,
  total_amount: Number,
  budgetid: String,
});

app.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = new User({ name, email, password });
    await user.save();
    res.json(user);
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (user) {
      const uid = user.id;
      const token = jwt.sign({ id: uid }, 'mySecretkey', { expiresIn: '2h' });
      console.log(uid);
      res.status(200).json({ status: 'success', uid, token });
    } else {
      res.status(401).json('failed');
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/create-budget', async (req, res) => {
  try {
    const { budget_category, amount, user_id } = req.body;
    const budget = new Budget({ budget_category, amount, user_id });
    await budget.save();
    res.json(budget);
  } catch (error) {
    console.error('Error adding budget:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/show-budget', async (req, res) => {
  try {
    const user_id = req.query.user_id;
    const budgetData = await Budget.find({ user_id });
    res.json(budgetData);
  } catch (error) {
    console.error('Error fetching budget data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/add-expense', async (req, res) => {
  try {
    const { user_id, expense_category, amount, budgetid } = req.body;

    const budget = await Budget.findOne({
      budget_category: expense_category,
      user_id,
    });

    const budget_id = budget ? budget.id : null;

    const monthlyExpense = new MonthlyExpense({
      user_id,
      budget_id,
      expense_category,
      total_amount: amount,
      budgetid,
    });

    await monthlyExpense.save();
    res.json(monthlyExpense);
  } catch (error) {
    console.error('Error adding expense:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/category-wise-budget', async (req, res) => {
    try {
      const user_id = req.query.user_id;
      const categoryWiseBudget = await Budget.aggregate([
        { $match: { user_id } },
        {
          $group: {
            _id: '$budget_category',
            amount: { $sum: '$amount' },
          },
        },
      ]);
  
      res.json(categoryWiseBudget);
    } catch (error) {
      console.error('Error fetching category-wise budget:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  app.get('/category-wise-expense', async (req, res) => {
    try {
      const user_id = req.query.user_id;
      const categoryWiseExpense = await MonthlyExpense.aggregate([
        { $match: { user_id } },
        {
          $group: {
            _id: '$expense_category',
            amount: { $sum: '$total_amount' },
          },
        },
      ]);
  
      res.json(categoryWiseExpense);
    } catch (error) {
      console.error('Error fetching category-wise expense:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  app.get('/total-budget-expense', async (req, res) => {
    try {
      const user_id = req.query.user_id;
  
      const budgetQuery = Budget.aggregate([
        { $match: { user_id } },
        { $group: { _id: null, totalBudget: { $sum: '$amount' } } },
      ]);
  
      const expenseQuery = MonthlyExpense.aggregate([
        { $match: { user_id } },
        { $group: { _id: null, totalExpense: { $sum: '$total_amount' } } },
      ]);
  
      const [budgetData, expenseData] = await Promise.all([
        budgetQuery.exec(),
        expenseQuery.exec(),
      ]);
  
      res.json({
        totalBudget: budgetData[0]?.totalBudget || 0,
        totalExpense: expenseData[0]?.totalExpense || 0,
      });
    } catch (error) {
      console.error('Error fetching total budget and expense:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  app.get('/category-wise-data', async (req, res) => {
    try {
      const categoryWiseData = await Budget.aggregate([
        {
          $lookup: {
            from: 'monthlyexpenses',
            localField: 'id',
            foreignField: 'budget_id',
            as: 'expenses',
          },
        },
        {
          $unwind: {
            path: '$expenses',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 0,
            budget_id: '$id',
            exp_id: '$expenses._id',
            category: '$budget_category',
            budget_amount: '$amount',
            expense_amount: '$expenses.total_amount',
          },
        },
      ]);
  
      res.json(categoryWiseData);
    } catch (error) {
      console.error('Error fetching category-wise data:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  app.get('/get-budget-id', async (req, res) => {
    const category = req.query.category;
  
    if (!category) {
      return res.status(400).json({ error: 'Category parameter is required' });
    }
  
    try {
      const budget = await Budget.findOne({ budget_category: category });
  
      if (budget) {
        return res.json({ id: budget.id });
      } else {
        return res.status(404).json({ error: 'Category not found' });
      }
    } catch (error) {
      console.error('Error fetching budget id:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });  
  

app.listen(8081, ()=>{
    console.log("Connected to database.")
})