const pool = require('../config/db');

// ÿ¨ŸÑÿ® ŸÉŸÑ ÿßŸÑŸÖŸÜÿ™ÿ¨ÿßÿ™
const getAllProducts = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM product ORDER BY type, name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: '‚ùå ÿÆÿ∑ÿ£ ŸÅŸä ÿßŸÑÿ≥Ÿäÿ±ŸÅÿ±', error: err.message });
  }
};

// ÿ•ÿ∂ÿßŸÅÿ© ŸÖŸÜÿ™ÿ¨ ÿ¨ÿØŸäÿØ
const addProduct = async (req, res) => {
  const { name, type, cost_price, selling_price } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO product (name, type, cost_price, selling_price) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, type, cost_price || 0, selling_price]
    );
    res.status(201).json({
      message: '‚úÖ ÿ™ŸÖ ÿ•ÿ∂ÿßŸÅÿ© ÿßŸÑŸÖŸÜÿ™ÿ¨ ÿ®ŸÜÿ¨ÿßÿ≠',
      product: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ message: '‚ùå ÿÆÿ∑ÿ£ ŸÅŸä ÿßŸÑÿ≥Ÿäÿ±ŸÅÿ±', error: err.message });
  }
};

// ÿ™ÿπÿØŸäŸÑ ŸÖŸÜÿ™ÿ¨
const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, type, cost_price, selling_price } = req.body;
  try {
    const result = await pool.query(
      `UPDATE product SET 
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        cost_price = COALESCE($3, cost_price),
        selling_price = COALESCE($4, selling_price)
       WHERE id = $5 RETURNING *`,
      [name, type, cost_price, selling_price, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'ÿßŸÑŸÖŸÜÿ™ÿ¨ ÿ∫Ÿäÿ± ŸÖŸàÿ¨ŸàÿØ' });
    res.json({ message: '‚úÖ ÿ™ŸÖ ÿ™ÿπÿØŸäŸÑ ÿßŸÑŸÖŸÜÿ™ÿ¨ ÿ®ŸÜÿ¨ÿßÿ≠', product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: '‚ùå ÿÆÿ∑ÿ£ ŸÅŸä ÿßŸÑÿ≥Ÿäÿ±ŸÅÿ±', error: err.message });
  }
};


const deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const inUse = await pool.query('SELECT COUNT(*) FROM transaction WHERE product_id = $1', [id]);
    if (parseInt(inUse.rows[0].count) > 0) {
      return res.status(400).json({ message: '·« Ì„ﬂ‰ Õ–› „‰ Ã „” Œœ„ ›Ì ⁄„·Ì« ' });
    }
    const result = await pool.query('DELETE FROM product WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: '«·„‰ Ã €Ì— „ÊÃÊœ' });
    res.json({ message: ' „ Õ–› «·„‰ Ã »‰Ã«Õ' });
  } catch (err) {
    res.status(500).json({ message: 'Œÿ√ ›Ì «·”Ì—›—', error: err.message });
  }
};
module.exports = { getAllProducts, addProduct, updateProduct, deleteProduct };
