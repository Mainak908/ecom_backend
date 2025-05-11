import { PrismaClient } from "./generated/prisma/client.js";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  // await prisma.review.deleteMany();
  // await prisma.orderItem.deleteMany();
  // await prisma.cartItem.deleteMany();
  // await prisma.order.deleteMany();
  // await prisma.cart.deleteMany();
  // await prisma.payment.deleteMany();
  // await prisma.productImage.deleteMany();
  // await prisma.product.deleteMany();
  // await prisma.category.deleteMany();
  // await prisma.address.deleteMany();
  // await prisma.user.deleteMany();

  // Create users
  const user = await prisma.user.create({
    data: {
      email: "user@example.com",
      password: "hashedpassword",
      name: "John Doe",
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: "hashedpassword",
      name: "Admin User",
      role: "ADMIN",
    },
  });

  // Categories
  const electronics = await prisma.category.create({
    data: { name: "Electronics" },
  });

  // Products
  const product1 = await prisma.product.create({
    data: {
      name: "Smartphone",
      slug: "smartphone",
      description: "Latest model smartphone",
      price: 699.99,
      stock: 10,
      categoryId: electronics.id,
      images: {
        create: [{ url: "https://via.placeholder.com/300x300" }],
      },
    },
  });

  const address = await prisma.address.create({
    data: {
      userId: user.id,
      fullName: "John Doe",
      phone: "1234567890",
      address1: "123 Street",
      city: "New York",
      state: "NY",
      postalCode: "10001",
      country: "USA",
    },
  });

  await prisma.cart.create({
    data: {
      userId: user.id,
      items: {
        create: {
          productId: product1.id,
          quantity: 2,
        },
      },
    },
  });

  await prisma.order.create({
    data: {
      userId: user.id,
      totalAmount: 1399.98,
      status: "PENDING",
      shippingAddressId: address.id,
      billingAddressId: address.id,
      items: {
        create: {
          productId: product1.id,
          quantity: 2,
          price: 699.99,
        },
      },
      payment: {
        create: {
          provider: "stripe",
          status: "PENDING",
          amount: 1399.98,
        },
      },
    },
  });
}

main()
  .then(() => console.log("✅ Seed complete"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
