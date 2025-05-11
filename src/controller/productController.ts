import { Router } from "express";
import { prisma } from "../client.js";

const router = Router();

// Create Category
router.post("/categories", async (req, res) => {
  const { name } = req.body;
  try {
    const category = await prisma.category.create({ data: { name } });
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ error: "Category already exists or invalid" });
  }
});

// Get All Categories
router.get("/categories", async (req, res) => {
  const categories = await prisma.category.findMany();
  res.json(categories);
});

// Update Category
router.put("/categories/:id", async (req, res) => {
  const { name } = req.body;
  try {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: { name },
    });
    res.json(category);
  } catch {
    res.status(404).json({ error: "Category not found" });
  }
});

// Delete Category
router.delete("/categories/:id", async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Category not found" });
  }
});

// Create Product
router.post("/products", async (req, res) => {
  const { name, slug, description, price, stock, categoryId, imageUrls } =
    req.body;
  try {
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        price: parseFloat(price),
        stock: parseInt(stock),
        categoryId,
        images: {
          create: imageUrls?.map((url: string) => ({ url })) || [],
        },
      },
      include: { images: true },
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: "Invalid product data or duplicate slug" });
  }
});

//stats api
router.get("/stats", async (req, res) => {
  const [productCount, userCount, orderCount, totalRevenue, recentOrders] =
    await Promise.all([
      prisma.product.count(),
      prisma.user.count(),
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: {
          totalAmount: true,
        },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          user: true,
          items: {
            include: { product: true },
          },
        },
      }),
    ]);

  res.status(200).json({
    stats: {
      products: productCount,
      users: userCount,
      orders: orderCount,
      revenue: totalRevenue._sum.totalAmount || 0,
    },
    recentOrders,
  });
});

// Get All Products (with Category & Images)
router.get("/products", async (req, res) => {
  const products = await prisma.product.findMany({
    include: { category: true, images: true },
  });
  res.json(products);
});

// Update Product
router.put("/products/:id", async (req, res) => {
  const { name, description, price, stock, categoryId } = req.body;
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { name, description, price, stock, categoryId },
    });
    res.json(product);
  } catch {
    res.status(404).json({ error: "Product not found" });
  }
});

// Delete Product
router.delete("/products/:id", async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Product not found" });
  }
});

// add to cart
router.post("/:userId/add", async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.params.userId;

  try {
    let cart = await prisma.cart.findFirst({ where: { userId } });

    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId },
    });

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
        },
      });
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    res.json(updatedCart);
  } catch (err) {
    res.status(500).json({ error: "Failed to add to cart" });
  }
});

// place order
router.post("/:userId/place", async (req, res) => {
  const userId = req.params.userId;

  try {
    const cart = await prisma.cart.findFirst({
      where: { userId },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      res.status(400).json({ error: "Cart is empty" });
      return;
    }

    const totalAmount = cart.items.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0
    );

    const address = await prisma.address.findFirst({ where: { userId } });

    if (!address) {
      res.status(400).json({ error: "User has no address" });
      return;
    }

    const order = await prisma.order.create({
      data: {
        userId,
        totalAmount,
        status: "PENDING",
        shippingAddressId: address.id,
        billingAddressId: address.id,
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
          })),
        },
        payment: {
          create: {
            provider: "cash_on_delivery",
            status: "PENDING",
            amount: totalAmount,
          },
        },
      },
      include: {
        items: { include: { product: true } },
        payment: true,
      },
    });

    // Clear cart
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: "Failed to place order" });
  }
});

export default router;
