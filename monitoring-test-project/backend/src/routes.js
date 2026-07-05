const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('./logger');

// GET /api/invoices - Get all invoices with pagination and filtering
router.get('/invoices', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const where = {};
    
    // Filter by status
    if (req.query.status) {
      where.status = req.query.status.toUpperCase();
    }
    
    // Filter by client email
    if (req.query.clientEmail) {
      where.clientEmail = req.query.clientEmail;
    }
    
    // Search by client name or invoice number
    if (req.query.search) {
      where.OR = [
        { clientName: { contains: req.query.search } },
        { invoiceNumber: { contains: req.query.search } }
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.invoice.count({ where })
    ]);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    logger.error('Error fetching invoices:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch invoices' 
    });
  }
});

// GET /api/invoices/:id - Get single invoice
router.get('/invoices/:id', async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        error: 'Invoice not found' 
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    logger.error('Error fetching invoice:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch invoice' 
    });
  }
});

// POST /api/invoices - Create new invoice
router.post('/invoices', async (req, res) => {
  try {
    const {
      invoiceNumber,
      clientName,
      clientEmail,
      amount,
      currency = 'USD',
      status = 'DRAFT',
      dueDate,
      description
    } = req.body;

    // Validation
    if (!invoiceNumber || !clientName || !clientEmail || !amount || !dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: invoiceNumber, clientName, clientEmail, amount, dueDate'
      });
    }

    // Check if invoice number already exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { invoiceNumber }
    });

    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        error: 'Invoice number already exists'
      });
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientName,
        clientEmail,
        amount: parseFloat(amount),
        currency,
        status,
        dueDate: new Date(dueDate),
        description
      }
    });

    logger.info(`New invoice created: ${invoiceNumber} for ${clientName}`);

    res.status(201).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    logger.error('Error creating invoice:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'Invoice number already exists'
      });
    }

    res.status(500).json({ 
      success: false, 
      error: 'Failed to create invoice' 
    });
  }
});

// PUT /api/invoices/:id - Update invoice
router.put('/invoices/:id', async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        error: 'Invoice not found' 
      });
    }

    const {
      invoiceNumber,
      clientName,
      clientEmail,
      amount,
      currency,
      status,
      dueDate,
      description
    } = req.body;

    // Check if invoice number is being changed and if it already exists
    if (invoiceNumber && invoiceNumber !== invoice.invoiceNumber) {
      const existingInvoice = await prisma.invoice.findUnique({
        where: { invoiceNumber }
      });

      if (existingInvoice) {
        return res.status(400).json({
          success: false,
          error: 'Invoice number already exists'
        });
      }
    }

    const updateData = {};
    if (invoiceNumber) updateData.invoiceNumber = invoiceNumber;
    if (clientName) updateData.clientName = clientName;
    if (clientEmail) updateData.clientEmail = clientEmail;
    if (amount) updateData.amount = parseFloat(amount);
    if (currency) updateData.currency = currency;
    if (status) updateData.status = status;
    if (dueDate) updateData.dueDate = new Date(dueDate);
    if (description !== undefined) updateData.description = description;

    const updatedInvoice = await prisma.invoice.update({
      where: { id: parseInt(req.params.id) },
      data: updateData
    });

    logger.info(`Invoice updated: ${updatedInvoice.invoiceNumber}`);

    res.json({
      success: true,
      data: updatedInvoice
    });
  } catch (error) {
    logger.error('Error updating invoice:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'Invoice number already exists'
      });
    }

    res.status(500).json({ 
      success: false, 
      error: 'Failed to update invoice' 
    });
  }
});

// DELETE /api/invoices/:id - Delete invoice
router.delete('/invoices/:id', async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        error: 'Invoice not found' 
      });
    }

    const invoiceNumber = invoice.invoiceNumber;
    await prisma.invoice.delete({
      where: { id: parseInt(req.params.id) }
    });

    logger.info(`Invoice deleted: ${invoiceNumber}`);

    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting invoice:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete invoice' 
    });
  }
});

// GET /api/stats - Get invoice statistics
router.get('/stats', async (req, res) => {
  try {
    const totalInvoices = await prisma.invoice.count();
    
    const statusCounts = await prisma.invoice.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    const paidInvoices = await prisma.invoice.findMany({
      where: { status: 'PAID' },
      select: { amount: true }
    });

    const totalAmount = paidInvoices.reduce((sum, invoice) => {
      return sum + Number(invoice.amount);
    }, 0);

    const overdueCount = await prisma.invoice.count({
      where: { status: 'OVERDUE' }
    });

    const statusCountsObj = statusCounts.reduce((acc, item) => {
      acc[item.status.toLowerCase()] = item._count.id;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalInvoices,
        statusCounts: statusCountsObj,
        totalPaidAmount: totalAmount,
        overdueCount
      }
    });
  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch statistics' 
    });
  }
});

module.exports = router;
