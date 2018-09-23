"use strict"

const chai = require("chai");
const chaiHttp = require("chai-http");
const faker = require("faker");
const mongoose = require("mongoose");

const expect = chai.expect;

const {BlogPost} = require("../models");
const {app, runServer, closeServer} = require("../server");
const {TEST_DATABASE_URL} = require("../config");

chai.use(chaiHttp);

function seedBlogPostData() {
    console.info('seeding blog post data');
    const seedData = [];

    for (let i=1; i<=5; i++) {
        seedData.push(generateBlogPostData());
    }
    return BlogPost.insertMany(seedData);
}

function generateTitle() {
    const titles = [
        'blog post 1', 'blog post 2', 'blog post 3', 'blog post 4', 'blog post 5'
    ];
    return titles[Math.floor(Math.random() * titles.length)];
}

function generateContent() {
    const contents = [
        'this is a blog post', 'look at this blog post', 'wow it is a blog post', 'check out the blog post'
    ];
    return contents[Math.floor(Math.random() * contents.length)];
}

function generateBlogPostData() {
    return {
        title: generateTitle(),
        content: generateContent(),
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        }
    }
}

function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('Blog Posts API resource', function () {

    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function() {
        return seedBlogPostData();
    });

    afterEach(function() {
        return tearDownDb();
    });

    after(function() {
        return closeServer();
    });

    describe('GET endpoint', function() {

        it('should return all existing blog posts', function() {
            let res;
            return chai.request(app)
                .get('/posts')
                .then(function(_res) {
                    res = _res;
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.lengthOf.at.least(1);
                    return BlogPost.count();
                })
                .then(function(count) {
                    expect(res.body).to.have.lengthOf(count);
                });
        });

        it('should return blog posts with right fields', function() {
            let resBlogPost;
            return chai.request(app)
                .get('/posts')
                .then(function(res) {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body).to.be.a('array');
                    expect(res.body).to.have.lengthOf.at.least(1);

                    res.body.forEach(function(blogPost) {
                        expect(blogPost).to.be.a('object');
                        expect(blogPost).to.include.keys(
                            'id', 'title', 'content', 'author', 'created'
                        );
                    });
                    resBlogPost = res.body[0];
                    return BlogPost.findById(resBlogPost.id);
                })
                .then(function(post) {

                    expect(resBlogPost.title).to.equal(post.title);
                    expect(resBlogPost.content).to.equal(post.content);
                    expect(resBlogPost.author).to.equal(post.authorName);
                });
        });
    });

    describe('POST endpoint', function() {
        it('should add a new blog post', function() {

            const newBlogPost = generateBlogPostData();

            return chai.request(app)
                .post('/posts')
                .send(newBlogPost)
                .then(function(res) {
                    expect(res).to.have.status(201);
                    expect(res).to.be.json;
                    expect(res.body).to.include.keys(
                        'id', 'title', 'content', 'author', 'created'
                    );
                    expect(res.body.title).to.be.equal(newBlogPost.title);
                    expect(res.body.id).to.not.be.null;
                    expect(res.body.content).to.be.equal(newBlogPost.content);
                    expect(res.body.author).to.be.equal(`${newBlogPost.author.firstName} ${newBlogPost.author.lastName}`);

                    return BlogPost.findById(res.body.id);
                })
                .then(function(post) {
                    expect(post.title).to.equal(newBlogPost.title);
                    expect(post.content).to.equal(newBlogPost.content);
                    expect(post.author.firstName).to.equal(newBlogPost.author.firstName);
                    expect(post.author.lastName).to.equal(newBlogPost.author.lastName);
                });
        });
    });

    describe('PUT endpoint', function() {
        it('should update fields you send over', function() {
            const updateData = {
                title: 'updated blog title',
                content: 'this is new blog content',
                author: {
                    firstName: 'Bob',
                    lastName: 'Smith'
                }
            };

            return BlogPost
                .findOne()
                .then(function(post) {
                    updateData.id = post.id;

                    return chai.request(app)
                        .put(`/posts/${post.id}`)
                        .send(updateData);
                })
                .then(function(res) {
                    expect(res).to.have.status(204);

                    return BlogPost.findById(updateData.id);
                })
                .then(function(post) {
                    expect(post.title).to.equal(updateData.title);
                    expect(post.content).to.equal(updateData.content);
                    expect(post.firstName).to.equal(updateData.firstName);
                    expect(post.lastName).to.equal(updateData.lastName);
                });
        });
    });

    describe('DELETE endpoint', function() {
        it('deletes a blog post by id', function() {

            let post;

            return BlogPost
                .findOne()
                .then(function(_post) {
                    post = _post;
                    return chai.request(app).delete(`/posts/${post.id}`);
                })
                .then(function(res) {
                    expect(res).to.have.status(204);
                    return BlogPost.findById(post.id);
                })
                .then(function(_post) {
                    expect(_post).to.be.null;
                });
        });
    });
})