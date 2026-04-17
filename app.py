from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import os
import uuid
from datetime import datetime

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'gemsistem_secret_2024_xK9mP')

# ─── BASE DE DATOS ────────────────────────────────────────────────────
# En Render usa DATABASE_URL (PostgreSQL). En local usa SQLite como fallback.
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///gemsistem.db')
# Render entrega URLs con prefijo "postgres://" pero SQLAlchemy necesita "postgresql://"
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join('static', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

# Admin credentials (hardcoded for security)
ADMIN_EMAIL = "gemsistem95@gmail.com"
ADMIN_PASSWORD_HASH = generate_password_hash("Gemsistem2024!")

db = SQLAlchemy(app)

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    icon = db.Column(db.String(50), default='💎')
    products = db.relationship('Product', backref='category', lazy=True)

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    price = db.Column(db.Float, nullable=False)
    original_price = db.Column(db.Float, nullable=True)
    images = db.Column(db.Text, default='')  # comma-separated paths
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=True)
    featured = db.Column(db.Boolean, default=False)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    whatsapp = db.Column(db.String(20), default='3161281410')
    email = db.Column(db.String(100), default='gemsistem95@gmail.com')

    def get_images(self):
        if self.images:
            return [img.strip() for img in self.images.split(',') if img.strip()]
        return []

    def get_discount(self):
        if self.original_price and self.original_price > self.price:
            return int(((self.original_price - self.price) / self.original_price) * 100)
        return 0

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def is_admin():
    return session.get('admin_logged_in', False)

# ─── INICIALIZAR BD Y CARPETAS AL ARRANCAR ────────────────────────────
with app.app_context():
    db.create_all()
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    if not Category.query.first():
        for name, icon in [
            ('Páginas Web', '🌐'),
            ('Menús Digitales', '📋'),
            ('Login & Auth', '🔐'),
            ('E-commerce', '🛒'),
            ('Apps Móviles', '📱'),
        ]:
            db.session.add(Category(name=name, icon=icon))
        db.session.commit()

# ─── RUTAS PÚBLICAS ───────────────────────────────────────────────────
@app.route('/')
def index():
    categories = Category.query.all()
    featured = Product.query.filter_by(featured=True, active=True).limit(8).all()
    recent = Product.query.filter_by(active=True).order_by(Product.created_at.desc()).limit(12).all()
    return render_template('index.html', categories=categories, featured=featured, recent=recent)

@app.route('/producto/<int:product_id>')
def product_detail(product_id):
    product = Product.query.get_or_404(product_id)
    related = Product.query.filter_by(category_id=product.category_id, active=True).filter(Product.id != product_id).limit(4).all()
    return render_template('product_detail.html', product=product, related=related)

@app.route('/categoria/<int:cat_id>')
def category(cat_id):
    cat = Category.query.get_or_404(cat_id)
    products = Product.query.filter_by(category_id=cat_id, active=True).all()
    categories = Category.query.all()
    return render_template('category.html', cat=cat, products=products, categories=categories)

@app.route('/buscar')
def search():
    q = request.args.get('q', '')
    products = []
    if q:
        products = Product.query.filter(
            Product.active == True,
            (Product.title.ilike(f'%{q}%') | Product.description.ilike(f'%{q}%'))
        ).all()
    categories = Category.query.all()
    return render_template('search.html', products=products, q=q, categories=categories)

@app.route('/servicios')
def servicios():
    return render_template('servicios.html')

# ─── ADMIN ────────────────────────────────────────────────────────────
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        if email == ADMIN_EMAIL and check_password_hash(ADMIN_PASSWORD_HASH, password):
            session['admin_logged_in'] = True
            return redirect(url_for('admin_dashboard'))
        flash('Credenciales incorrectas', 'error')
    return render_template('admin_login.html')

@app.route('/admin/logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for('index'))

@app.route('/admin')
def admin_dashboard():
    if not is_admin():
        return redirect(url_for('admin_login'))
    products = Product.query.order_by(Product.created_at.desc()).all()
    categories = Category.query.all()
    return render_template('admin_dashboard.html', products=products, categories=categories)

@app.route('/admin/producto/nuevo', methods=['GET', 'POST'])
def admin_new_product():
    if not is_admin():
        return redirect(url_for('admin_login'))
    categories = Category.query.all()
    if request.method == 'POST':
        images_paths = []
        files = request.files.getlist('images')
        for file in files:
            if file and allowed_file(file.filename):
                ext = file.filename.rsplit('.', 1)[1].lower()
                filename = f"{uuid.uuid4().hex}.{ext}"
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                images_paths.append(filename)

        product = Product(
            title=request.form['title'],
            description=request.form['description'],
            price=float(request.form['price']),
            original_price=float(request.form['original_price']) if request.form.get('original_price') else None,
            images=','.join(images_paths),
            category_id=int(request.form['category_id']) if request.form.get('category_id') else None,
            featured='featured' in request.form,
            active='active' in request.form,
        )
        db.session.add(product)
        db.session.commit()
        flash('Producto creado exitosamente', 'success')
        return redirect(url_for('admin_dashboard'))
    return render_template('admin_product_form.html', product=None, categories=categories)

@app.route('/admin/producto/editar/<int:product_id>', methods=['GET', 'POST'])
def admin_edit_product(product_id):
    if not is_admin():
        return redirect(url_for('admin_login'))
    product = Product.query.get_or_404(product_id)
    categories = Category.query.all()
    if request.method == 'POST':
        product.title = request.form['title']
        product.description = request.form['description']
        product.price = float(request.form['price'])
        product.original_price = float(request.form['original_price']) if request.form.get('original_price') else None
        product.category_id = int(request.form['category_id']) if request.form.get('category_id') else None
        product.featured = 'featured' in request.form
        product.active = 'active' in request.form

        files = request.files.getlist('images')
        new_images = []
        for file in files:
            if file and file.filename and allowed_file(file.filename):
                ext = file.filename.rsplit('.', 1)[1].lower()
                filename = f"{uuid.uuid4().hex}.{ext}"
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                new_images.append(filename)

        if new_images:
            existing = product.get_images()
            product.images = ','.join(existing + new_images)

        db.session.commit()
        flash('Producto actualizado', 'success')
        return redirect(url_for('admin_dashboard'))
    return render_template('admin_product_form.html', product=product, categories=categories)

@app.route('/admin/producto/eliminar/<int:product_id>', methods=['POST'])
def admin_delete_product(product_id):
    if not is_admin():
        return jsonify({'error': 'No autorizado'}), 403
    product = Product.query.get_or_404(product_id)
    db.session.delete(product)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/admin/imagen/eliminar', methods=['POST'])
def admin_delete_image():
    if not is_admin():
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json()
    product_id = data.get('product_id')
    image_name = data.get('image')
    product = Product.query.get_or_404(product_id)
    images = product.get_images()
    if image_name in images:
        images.remove(image_name)
        product.images = ','.join(images)
        db.session.commit()
        try:
            os.remove(os.path.join(app.config['UPLOAD_FOLDER'], image_name))
        except:
            pass
    return jsonify({'success': True})

@app.route('/admin/categoria/nueva', methods=['POST'])
def admin_new_category():
    if not is_admin():
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json()
    cat = Category(name=data['name'], icon=data.get('icon', '💎'))
    db.session.add(cat)
    db.session.commit()
    return jsonify({'success': True, 'id': cat.id})

@app.route('/admin/categoria/eliminar/<int:cat_id>', methods=['POST'])
def admin_delete_category(cat_id):
    if not is_admin():
        return jsonify({'error': 'No autorizado'}), 403
    cat = Category.query.get_or_404(cat_id)
    db.session.delete(cat)
    db.session.commit()
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
